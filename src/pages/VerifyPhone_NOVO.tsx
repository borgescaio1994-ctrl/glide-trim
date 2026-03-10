import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, MessageCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function VerifyPhone() {
  const { user, fetchProfile, fetchProfileImmediate } = useAuth();
  const navigate = useNavigate();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [currentPhone, setCurrentPhone] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user && !user.user_metadata?.phone) {
      fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  // Limpa estados ao desmontar
  useEffect(() => {
    return () => {
      setPhoneNumber('');
      setVerificationCode('');
      setCodeSent(false);
      setCurrentPhone('');
      setCurrentCode('');
    };
  }, []);

  const handleSendCode = async () => {
    if (verifyingPhone || !phoneNumber || isProcessing) return;
    
    setIsProcessing(true);
    setVerifyingPhone(true);

    try {
      // Limpa e formata o número
      const digits = phoneNumber.replace(/\D/g, '');
      
      // Validação básica
      if (digits.length < 10 || digits.length > 15) {
        toast.error('Número inválido. Digite um número válido.');
        return;
      }
      
      // Formata número completo
      const fullPhone = digits.startsWith('55') ? digits : `55${digits}`;
      
      console.log('🔵 Enviando código para:', fullPhone);
      
      // Gera código único
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Limpa códigos antigos
      await supabase.from('phone_verifications').delete().eq('phone_number', fullPhone);
      
      // Salva novo código
      const { error: insertError } = await supabase.from('phone_verifications').insert({
        phone_number: fullPhone,
        verification_code: code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

      if (insertError) {
        console.error('❌ Erro ao salvar código:', insertError);
        toast.error('Erro ao gerar código. Tente novamente.');
        return;
      }

      // Envia via WhatsApp
      try {
        const webhookUrl = 'http://72.60.159.183:5678/webhook/64d8e09c-03a0-4d2c-8ada-141e0e26aac3';
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: fullPhone,
            code: code,
            action: 'send_verification_code'
          }),
        });

        if (response.ok) {
          console.log('✅ Código enviado via WhatsApp');
        }
      } catch (error) {
        console.warn('⚠️ Erro ao enviar WhatsApp:', error);
      }

      setCurrentPhone(fullPhone);
      setCurrentCode(code);
      setCodeSent(true);
      toast.success('Código enviado com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro geral:', error);
      toast.error('Erro ao processar. Tente novamente.');
    } finally {
      setVerifyingPhone(false);
      setIsProcessing(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verifyingCode || !user?.id || isProcessing) return;
    
    setIsProcessing(true);
    setVerifyingCode(true);

    try {
      const cleanCode = verificationCode.trim();
      
      // Validações básicas
      if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
        toast.error('Código inválido. Digite 6 números.');
        return;
      }

      console.log('🔵 Verificando código:', cleanCode, 'para telefone:', currentPhone);
      
      // Busca verificação no banco
      const { data: verificationData, error: fetchError } = await supabase
        .from('phone_verifications')
        .select('*')
        .eq('phone_number', currentPhone)
        .eq('verification_code', cleanCode)
        .single();

      if (fetchError) {
        console.error('❌ Erro ao buscar código:', fetchError);
        toast.error('Código não encontrado. Solicite um novo.');
        return;
      }

      if (!verificationData) {
        toast.error('Código incorreto. Verifique e tente novamente.');
        return;
      }

      // Verifica expiração
      if (new Date() > new Date(verificationData.expires_at)) {
        toast.error('Código expirado. Solicite um novo.');
        return;
      }

      // Marca como verificado
      const { error: updateError } = await supabase
        .from('phone_verifications')
        .update({ verified_at: new Date().toISOString() })
        .eq('id', verificationData.id);

      if (updateError) {
        console.error('❌ Erro ao marcar verificação:', updateError);
      }

      // Atualiza perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          phone: currentPhone,
          phone_number: currentPhone,
          whatsapp_number: currentPhone,
          is_verified: true
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('❌ Erro ao atualizar perfil:', profileError);
        toast.error('Erro ao salvar número. Tente novamente.');
        return;
      }

      // Atualiza estado local
      await fetchProfileImmediate(user.id, {
        is_verified: true,
        phone: currentPhone,
        phone_number: currentPhone,
        whatsapp_number: currentPhone
      });

      toast.success('WhatsApp verificado com sucesso!');
      
      // Redireciona
      setTimeout(() => {
        const returnToBooking = sessionStorage.getItem('returnToBooking');
        if (returnToBooking) {
          sessionStorage.removeItem('returnToBooking');
          window.location.href = returnToBooking;
        } else {
          window.location.href = '/profile';
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erro na verificação:', error);
      toast.error('Erro ao verificar. Tente novamente.');
    } finally {
      setVerifyingCode(false);
      setIsProcessing(false);
    }
  };

  const handleSkipVerification = () => {
    toast.info('Você pode verificar seu telefone mais tarde no perfil.');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verificar WhatsApp
            </h1>
            <p className="text-gray-600">
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
                    disabled={isProcessing}
                  />
                </div>
                
                <Button 
                  onClick={handleSendCode}
                  disabled={verifyingPhone || !phoneNumber || isProcessing}
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
                  <Label className="text-sm font-medium mb-2 block">
                    Código de verificação
                  </Label>
                  <Input
                    type="text"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-11 text-center text-lg font-mono"
                    maxLength={6}
                    disabled={isProcessing}
                  />
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Digite o código de 6 dígitos enviado para {currentPhone}
                </p>
                
                <div className="space-y-2">
                  <Button 
                    onClick={handleVerifyCode}
                    disabled={verifyingCode || verificationCode.length !== 6 || isProcessing}
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
                    disabled={isProcessing}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="text-center space-y-4 mt-6">
            <Button 
              variant="ghost" 
              onClick={handleSkipVerification}
              className="text-muted-foreground hover:text-foreground"
              disabled={isProcessing}
            >
              Verificar Depois
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
