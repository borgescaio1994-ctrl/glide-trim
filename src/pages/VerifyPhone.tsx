import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { validateAuthCode } from '@/lib/authUtils';
import { setDeferred } from '@/lib/verificationStorage';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ShieldCheck, Loader2, MessageCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useEstablishment } from '@/hooks/useEstablishment';

export default function VerifyPhone() {
  const { user, profile, fetchProfile, fetchProfileImmediate } = useAuth();
  const { establishmentId: establishmentIdFromDomain } = useEstablishment();
  const { success: toastSuccess, error: toastError } = useToast();
  const navigate = useNavigate();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  useEffect(() => {
    const pendingPhone = localStorage.getItem('pending_phone');
    if (pendingPhone) {
      setPhoneNumber(pendingPhone);
      setCodeSent(true);
    }
  }, []);

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toastError('Digite um número válido');
      return;
    }

    setVerifyingPhone(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const digits = phoneNumber.replace(/\D/g, '');
      const fullPhone = digits.length === 11 ? `55${digits}` : digits;

      localStorage.setItem('pending_phone', fullPhone);

      await supabase.from('phone_verifications').delete().eq('phone_number', fullPhone);
      const { error: insertErr } = await supabase.from('phone_verifications').insert({
        phone_number: fullPhone,
        verification_code: code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      if (insertErr) throw insertErr;

      const route =
        profile?.profile_role === 'ADMIN_BARBER' ? 'MASTER_TO_OWNER' : 'SHOP_TO_CLIENT';
      let barberId: string | undefined;
      let pendingEstablishmentId: string | undefined;
      try {
        const raw = typeof window !== 'undefined' ? sessionStorage.getItem('pendingBooking') : null;
        if (raw) {
          const p = JSON.parse(raw);
          barberId = p.barber_id ?? p.barberId;
          pendingEstablishmentId = p.establishment_id;
        }
      } catch {
        /* ignore */
      }

      // Cliente não tem establishment_id no perfil: usa agendamento pendente ou domínio (slug da loja)
      const establishmentIdForRoute =
        profile?.establishment_id ??
        pendingEstablishmentId ??
        establishmentIdFromDomain ??
        undefined;

      try {
        await supabase.functions.invoke('send-whatsapp-verification', {
          body: {
            phone: fullPhone,
            code,
            route,
            establishment_id: establishmentIdForRoute,
            barber_id: barberId,
          },
        });
      } catch {
        // fallback: código já salvo no banco
      }

      setCodeSent(true);
      toastSuccess('Código enviado para seu WhatsApp!');
    } catch {
      toastError('Erro ao enviar código. Tente novamente.');
    } finally {
      setVerifyingPhone(false);
    }
  };

  const handleVerifyLater = () => {
    setDeferred();
    navigate('/profile', { replace: true });
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || verificationCode.trim().length !== 6) {
      toastError('Digite o código de 6 dígitos recebido');
      return;
    }
    if (!user?.id) {
      toastError('Sessão inválida. Faça login novamente.');
      return;
    }
    const pendingPhone = localStorage.getItem('pending_phone');
    if (!pendingPhone) {
      toastError('Telefone não encontrado. Envie o código novamente.');
      return;
    }

    setVerifyingCode(true);
    try {
      const code = verificationCode.trim();
      const success = await validateAuthCode(pendingPhone, code, user.id);

      if (success) {
        localStorage.removeItem('pending_phone');
        setVerifyingCode(false);

        await fetchProfileImmediate(user.id, pendingPhone);
        await fetchProfile(user.id);

        // Se quem verificou é ADMIN_BARBER: ativa onboarding da unidade e define sender oficial
        if (profile?.profile_role === 'ADMIN_BARBER' && profile?.establishment_id) {
          await supabase
            .from('establishments')
            .update({
              onboarding_status: 'ACTIVE',
              whatsapp_sender_phone: pendingPhone,
              owner_phone_verified_at: new Date().toISOString(),
            } as any)
            .eq('id', profile.establishment_id);
        }

        const pendingBookingRaw = typeof window !== 'undefined' ? sessionStorage.getItem('pendingBooking') : null;
        if (pendingBookingRaw) {
          try {
            const { barberId, serviceId, selectedDate, selectedTime, duration_minutes } = JSON.parse(pendingBookingRaw);
            const slotStart = parseInt(selectedTime.split(':')[0], 10) * 60 + parseInt(selectedTime.split(':')[1], 10);
            const slotEnd = slotStart + duration_minutes;
            const endTime = `${Math.floor(slotEnd / 60).toString().padStart(2, '0')}:${(slotEnd % 60).toString().padStart(2, '0')}`;
            const { error } = await supabase.from('appointments').insert({
              client_id: user.id,
              barber_id: barberId,
              service_id: serviceId,
              appointment_date: selectedDate,
              start_time: selectedTime,
              end_time: endTime,
              status: 'scheduled',
              phone_number: pendingPhone,
            });
            sessionStorage.removeItem('pendingBooking');
            sessionStorage.removeItem('returnToBooking');
            if (error) throw error;
            toastSuccess('WhatsApp verificado e agendamento concluído com sucesso!');
            window.history.replaceState(null, '', '/appointments');
            window.location.href = '/appointments';
          } catch {
            sessionStorage.removeItem('pendingBooking');
            sessionStorage.removeItem('returnToBooking');
            toastSuccess('WhatsApp verificado com sucesso!');
            toastError('Agendamento não concluído (horário pode estar ocupado). Tente agendar novamente.');
            window.history.replaceState(null, '', '/appointments');
            window.location.href = '/appointments';
          }
          return;
        }

        toastSuccess('WhatsApp verificado com sucesso!');
        const returnTo = typeof window !== 'undefined' ? sessionStorage.getItem('returnToBooking') : null;
        const targetPath = returnTo || '/profile';
        if (returnTo) sessionStorage.removeItem('returnToBooking');
        navigate(targetPath, { replace: true });
        return;
      }
      toastError('Código incorreto ou expirado');
    } catch {
      toastError('Erro na verificação. Tente novamente.');
    } finally {
      setVerifyingCode(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <ShieldCheck className="w-12 h-12 text-primary mx-auto" />
          <h1 className="text-2xl font-bold font-montserrat">Vincular WhatsApp</h1>
          <p className="text-muted-foreground">
            Envie um código para seu WhatsApp e confirme para vincular
          </p>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
          {!codeSent ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone" className="text-sm font-medium mb-2 block">
                  Seu WhatsApp
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="DDD + Número"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  className="h-11"
                />
              </div>
              <Button
                onClick={handleSendCode}
                disabled={verifyingPhone || !phoneNumber}
                className="w-full h-11"
              >
                {verifyingPhone ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Enviar Código
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Código de verificação</label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  className="h-11 text-center text-lg font-mono"
                  maxLength={6}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Digite o código de 6 dígitos enviado para seu WhatsApp
              </p>
              <div className="space-y-2">
                <Button
                  onClick={handleVerifyCode}
                  disabled={verifyingCode || verificationCode.length !== 6}
                  className="w-full h-11"
                >
                  {verifyingCode ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar Código'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCodeSent(false);
                    setVerificationCode('');
                  }}
                  className="w-full h-11"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleVerifyLater}
                  className="w-full h-11 text-muted-foreground hover:text-foreground"
                >
                  Verificar Depois
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={handleVerifyLater}
            className="text-muted-foreground hover:text-foreground"
          >
            Verificar Depois
          </Button>
        </div>
      </div>
    </div>
  );
}
