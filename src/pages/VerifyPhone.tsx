import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, MessageCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function VerifyPhone() {
  const { user, fetchProfile } = useAuth();
  const navigate = useNavigate();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  useEffect(() => {
    if (user && !user.user_metadata?.phone) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  // Limpa estados ao desmontar
  useEffect(() => {
    return () => {
      setVerificationCode('');
      setCodeSent(false);
    };
  }, []);

  const handleSendCode = async () => {
    if (verifyingPhone || !phoneNumber) return;
    setVerifyingPhone(true);
    
    // Formatação do número: remove tudo que não é dígito e adiciona DDI 55
    const digits = phoneNumber.replace(/\D/g, '');
    const fullPhone = digits.length === 11 ? `55${digits}` : digits;
    
    // Gera código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);

    try {
      console.log('🔵 Enviando código para:', fullPhone, 'código:', code);
      
      // 1. Limpeza preventiva para evitar erro de duplicidade
      await supabase.from('phone_verifications').delete().eq('phone_number', fullPhone);

      // 2. Insere o novo código no banco
      const { error: dbError } = await supabase.from('phone_verifications').insert({
        phone_number: fullPhone,
        verification_code: code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

      if (dbError) throw dbError;

      // 3. Tenta enviar via WhatsApp (se a função existir)
      try {
        const { error: funcError } = await supabase.functions.invoke('send-whatsapp-verification', { 
          body: { phone: fullPhone, code } 
        });

        if (funcError) {
          console.warn('Função WhatsApp não disponível, mas código foi salvo:', funcError);
          // Não falha completamente se a função não existir
        }
      } catch (funcError) {
        console.warn('Função WhatsApp não disponível, mas código foi salvo');
        // Não falha completamente se a função não existir
      }

      localStorage.setItem('pending_phone', fullPhone);
      toast.success('Código enviado com sucesso!');
      setCodeSent(true);
      console.log('✅ Código enviado com sucesso!');
    } catch (error) {
      console.error("Erro ao enviar:", error);
      toast.error('Erro ao enviar código. Tente novamente.');
    } finally { 
      setVerifyingPhone(false); 
    }
  };

  const handleVerifyCode = async () => {
    if (verifyingCode || !user?.id) return;
    setVerifyingCode(true);

    try {
      if (verificationCode.trim() === generatedCode) {
        const fullPhone = localStorage.getItem('pending_phone') || phoneNumber.replace(/\D/g, '');
        
        console.log('🔵 Código correto! Salvando telefone:', fullPhone);
        console.log('🔵 User ID:', user?.id);
        
        // Salva o número no perfil
        const { error } = await supabase
          .from('profiles')
          .update({ 
            phone: fullPhone,
            phone_number: fullPhone,
            whatsapp_number: fullPhone
          })
          .eq('id', user.id);

        console.log('🔵 Resultado do update:', error);

        if (!error) {
          console.log('✅ Perfil atualizado com sucesso!');
          localStorage.removeItem('pending_phone');
          toast.success('WhatsApp verificado com sucesso!');
          
          // Verifica se veio do agendamento para voltar para lá
          const returnToBooking = sessionStorage.getItem('returnToBooking');
          if (returnToBooking) {
            console.log('🔵 Retornando para agendamento...');
            sessionStorage.removeItem('returnToBooking');
            navigate(returnToBooking);
          } else {
            console.log('🔵 Redirecionando para /profile...');
            navigate('/profile');
          }
        } else {
          console.error("Erro ao salvar perfil:", error);
          toast.error('Erro ao salvar número. Tente novamente.');
        }
      } else {
        console.log('🔴 Código incorreto:', verificationCode, 'esperado:', generatedCode);
        toast.error('Código incorreto. Tente novamente.');
      }
    } catch (error) {
      console.error("Erro na verificação:", error);
      toast.error('Erro ao verificar. Tente novamente.');
    } finally {
      console.log('🔵 Finalizando verificação, setVerifyingCode(false)');
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
          {/* Step 1: Send Code */}
          {!codeSent ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Seu WhatsApp</label>
                <Input
                  type="tel"
                  placeholder="DDD + Número"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
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
            /* Step 2: Verify Code */
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Código de verificação</label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
              </div>
            </div>
          )}
        </div>

        <div className="text-center space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => {
              const returnToBooking = sessionStorage.getItem('returnToBooking');
              if (returnToBooking) {
                sessionStorage.removeItem('returnToBooking');
                navigate(returnToBooking);
              } else {
                navigate('/profile');
              }
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            Verificar Depois
          </Button>
        </div>
      </div>
    </div>
  );
}
