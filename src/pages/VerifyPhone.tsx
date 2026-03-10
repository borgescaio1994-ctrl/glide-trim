import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, MessageCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { validateAuthCode } from '@/lib/authUtils';

export default function VerifyPhone() {
  const { user, profile, fetchProfileImmediate } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Se profile.phone_number existir, preencha o input automaticamente
  useEffect(() => {
    if (profile?.phone_number) {
      setPhoneNumber(profile.phone_number);
    }
  }, [profile]);

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Digite um número de telefone válido');
      return;
    }

    setIsLoading(true);
    
    try {
      const digits = phoneNumber.replace(/\D/g, '');
      const fullPhone = digits.length === 11 ? `55${digits}` : digits;
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Limpa registros antigos
      await supabase.from('phone_verifications').delete().eq('phone_number', fullPhone);

      // Insere novo código
      const { error } = await supabase.from('phone_verifications').insert({
        phone_number: fullPhone,
        verification_code: code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

      if (error) throw error;

      // Envia via WhatsApp
      try {
        const webhookUrl = 'http://72.60.159.183:5678/webhook/64d8e09c-03a0-4d2c-8ada-141e0e26aac3';
        const horario = new Date().toLocaleString('pt-BR', { 
          timeZone: 'America/Sao_Paulo',
          dateStyle: 'short',
          timeStyle: 'short'
        });

        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: fullPhone,
            horario: horario,
            code: code,
            action: 'send_verification_code'
          }),
        });
      } catch (error) {
        console.warn('Erro ao enviar WhatsApp:', error);
      }

      toast.success('Código enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar código:', error);
      toast.error('Erro ao enviar código. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }

    setVerifying(true);
    
    try {
      const digits = phoneNumber.replace(/\D/g, '');
      const fullPhone = digits.length === 11 ? `55${digits}` : digits;

      // O botão de 'Verificar' deve chamar a função validateAuthCode
      const isValid = await validateAuthCode(fullPhone, verificationCode);
      
      if (!isValid) {
        toast.error('Código incorreto ou expirado');
        return;
      }

      // Após o sucesso da validação, chame fetchProfileImmediate
      await fetchProfileImmediate(user.id, fullPhone);
      
      toast.success('WhatsApp verificado com sucesso!');
      
      // E só então use navigate('/', { replace: true })
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1000);
      
    } catch (error) {
      console.error('Erro na verificação:', error);
      toast.error('Erro ao verificar. Tente novamente.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-5">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <ShieldCheck className="w-12 h-12 text-yellow-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Vincular WhatsApp</h1>
          <p className="text-gray-400">
            Enviamos um código de 6 dígitos para seu WhatsApp
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-gray-300">Número de WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 91560-5439"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="bg-[#121212] border-gray-700 text-white placeholder-gray-500"
              maxLength={15}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code" className="text-gray-300">Código de verificação</Label>
            <Input
              id="code"
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              className="bg-[#121212] border-gray-700 text-white placeholder-gray-500"
              maxLength={6}
            />
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleSendCode}
              disabled={isLoading || !phoneNumber}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageCircle className="w-4 h-4 mr-2" />}
              Enviar Código
            </Button>

            <Button
              onClick={handleVerify}
              disabled={verifying || !verificationCode || verificationCode.length !== 6}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Verificar e Entrar
            </Button>
          </div>
        </div>

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/login')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para o login
          </Button>
        </div>
      </div>
    </div>
  );
}
