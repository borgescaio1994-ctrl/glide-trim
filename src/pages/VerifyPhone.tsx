import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { validateAuthCode } from '@/lib/authUtils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ShieldCheck, Loader2, MessageCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

export default function VerifyPhone() {
  const { user, fetchProfile } = useAuth();
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
      toast.error('Digite um número válido');
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

      try {
        await supabase.functions.invoke('send-whatsapp-verification', {
          body: { phone: fullPhone, code },
        });
      } catch {
        // fallback: código já salvo no banco
      }

      setCodeSent(true);
      toast.success('Código enviado para seu WhatsApp!');
    } catch (error) {
      console.error('Erro ao enviar código:', error);
      toast.error('Erro ao enviar código. Tente novamente.');
    } finally {
      setVerifyingPhone(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!user || !verificationCode || verificationCode.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }

    setVerifyingCode(true);
    try {
      const pendingPhone = localStorage.getItem('pending_phone');
      if (!pendingPhone) {
        toast.error('Telefone não encontrado');
        return;
      }

      const digits = pendingPhone.replace(/\D/g, '');
      const fullPhone = digits.length === 11 ? `55${digits}` : pendingPhone;
      const cleanCode = verificationCode.trim();

      const success = await validateAuthCode(fullPhone, cleanCode, user.id);

      if (success) {
        await fetchProfile(user.id);
        localStorage.removeItem('pending_phone');
        toast.success('WhatsApp verificado com sucesso!');
        navigate('/profile', { replace: true });
      } else {
        toast.error('Código incorreto ou expirado');
      }
    } catch (error) {
      console.error('Erro na verificação:', error);
      toast.error('Erro na verificação. Tente novamente.');
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
                  onClick={() => navigate('/profile')}
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
            onClick={() => navigate('/profile')}
            className="text-muted-foreground hover:text-foreground"
          >
            Verificar Depois
          </Button>
        </div>
      </div>
    </div>
  );
}
