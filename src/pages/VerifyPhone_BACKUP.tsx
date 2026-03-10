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
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  useEffect(() => {
    if (user && !user.user_metadata?.phone) {
      fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  // Limpa estados ao desmontar
  useEffect(() => {
    return () => {
      setVerificationCode('');
      setCodeSent(false);
    };
  }, []);

  // Botão para pular verificação
  const handleSkipVerification = () => {
    toast.info('Você pode verificar seu telefone mais tarde no perfil.');
    navigate('/');
  };

  const handleSendCode = async () => {
    if (verifyingPhone || !phoneNumber) return;
    setVerifyingPhone(true);

    try {
      // Formatação e validação do número de telefone
      const digits = phoneNumber.replace(/\D/g, '');
      const fullPhone = digits.length === 11 ? `55${digits}` : digits;
      
      // Validação básica do número
      if (digits.length < 10 || digits.length > 11) {
        console.error('❌ Número de WhatsApp inválido');
        toast.error('Número deve ter 10 ou 11 dígitos (DDD + número)');
        setVerifyingPhone(false);
        return;
      }
      
      console.log('🔵 Número formatado para WhatsApp:', fullPhone);
      
      // Gera código de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);

      // 1. Limpeza preventiva para evitar erro de duplicidade
      await supabase.from('phone_verifications').delete().eq('phone_number', fullPhone);

      // 2. Insere o novo código no banco
      const { error: dbError } = await supabase.from('phone_verifications').insert({
        phone_number: fullPhone,
        verification_code: code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

      if (dbError) {
        console.error('❌ Erro ao salvar código no banco:', dbError);
        toast.error('Erro ao gerar código. Tente novamente.');
        setVerifyingPhone(false);
        return;
      }

      console.log('✅ Código gerado e salvo no banco:', code);
      
      // 3. Envia código via WhatsApp usando fetch direto para n8n
      try {
        const webhookUrl = 'http://72.60.159.183:5678/webhook/64d8e09c-03a0-4d2c-8ada-141e0e26aac3';
        const horario = new Date().toLocaleString('pt-BR', { 
          timeZone: 'America/Sao_Paulo',
          dateStyle: 'short',
          timeStyle: 'short'
        });

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: fullPhone,
            horario: horario,
            code: code,
            action: 'send_verification_code'
          }),
        });

        if (response.ok) {
          console.log('✅ Código enviado via WhatsApp com sucesso!');
        } else {
          console.warn('Erro ao enviar WhatsApp, mas código foi salvo no banco');
        }
      } catch (funcError) {
        console.warn('Erro ao enviar WhatsApp, mas código foi salvo no banco:', funcError);
      }

      localStorage.setItem('pending_phone', fullPhone);
      toast.success('Código enviado com sucesso!');
      setCodeSent(true);
    } catch (error) {
      console.error("Erro ao enviar código:", error);
      toast.error('Erro ao enviar código. Tente novamente.');
    } finally {
      setVerifyingPhone(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verifyingCode || !user?.id) return;
    setVerifyingCode(true);

    try {
      const fullPhone = localStorage.getItem('pending_phone') || phoneNumber.replace(/\D/g, '');
      
      console.log('🔵 Verificando código para telefone:', fullPhone);
      console.log('🔵 Código digitado:', verificationCode);
      console.log('🔵 User ID:', user?.id);
      
      // Validação robusta para evitar loop infinito
      const cleanCode = verificationCode.trim();
      
      // 1. Verificar se código está vazio
      if (!cleanCode) {
        console.error('❌ Código vazio detectado');
        toast.error('Por favor, digite o código de 6 dígitos.');
        setVerifyingCode(false);
        return;
      }
      
      // 2. Verificar se código tem apenas dígitos
      if (!/^\d{6}$/.test(cleanCode)) {
        console.error('❌ Código inválido detectado:', cleanCode);
        toast.error('Código inválido. Use apenas números.');
        setVerifyingCode(false);
        return;
      }
      
      // 3. Tratar códigos especiais que causam loop
      const specialCodes = ['000000', '111111', '222222', '333333', '444444', '555555'];
      if (specialCodes.includes(cleanCode)) {
        console.error('❌ Código especial detectado:', cleanCode);
        toast.error('Código especial detectado. Use o código recebido via WhatsApp.');
        setVerifyingCode(false);
        return;
      }
      
      // 4. Verificar se código "0" (já tratado mas reforçando)
      if (cleanCode === '0') {
        console.error('❌ Código "0" detectado, tratando como caso especial');
        toast.error('Código "0" não é válido. Por favor, use o código recebido via WhatsApp.');
        setVerifyingCode(false);
        return;
      }
      
      // 5. Confirmar que o número corresponde ao que está sendo verificado
      const expectedPhone = localStorage.getItem('pending_phone');
      if (!expectedPhone || fullPhone !== expectedPhone) {
        console.error('❌ Número não corresponde ao esperado:', { expected: expectedPhone, actual: fullPhone });
        toast.error('Número não corresponde ao que foi enviado o código. Por favor, verifique o número.');
        setVerifyingCode(false);
        return;
      }
      
      // 6. Buscar código no banco de dados (só continua se código for válido)
      const { data: verificationData, error: fetchError } = await supabase
        .from('phone_verifications')
        .select('*')
        .eq('phone_number', fullPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        console.error('❌ Erro ao buscar verificação:', fetchError);
        toast.error('Código não encontrado. Solicite um novo.');
        return;
      }

      if (!verificationData) {
        console.error('❌ Nenhuma verificação encontrada para este telefone');
        toast.error('Código não encontrado. Solicite um novo.');
        return;
      }

      // 2. Verificar se o código expirou
      const now = new Date();
      const expiresAt = new Date(verificationData.expires_at);
      if (now > expiresAt) {
        console.error('❌ Código expirou');
        toast.error('Código expirado. Solicite um novo.');
        return;
      }

      // 3. Comparar código digitado com código do banco
      if (cleanCode === verificationData.verification_code) {
        console.log('✅ Código correto!');
        
        // 4. Atualizar verified_at na tabela phone_verifications
        const { error: updateError } = await supabase
          .from('phone_verifications')
          .update({ 
            verified_at: new Date().toISOString()
          })
          .eq('id', verificationData.id);

        if (updateError) {
          console.error('❌ Erro ao atualizar verified_at:', updateError);
          // Não falha completamente, mas loga o erro
        }

        // 5. Salva o número e marca como verificado no perfil
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            phone: fullPhone,
            phone_number: fullPhone,
            whatsapp_number: fullPhone,
            is_verified: true  // IMPORTANTE: Marca como verificado
          })
          .eq('id', user.id);

        console.log('🔵 Resultado do update do perfil:', profileError);

        if (!profileError) {
          console.log('✅ Perfil atualizado com sucesso!');
          localStorage.removeItem('pending_phone');
          
          // Atualizar perfil localmente sem depender de refresh
          const { data: updatedProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (updatedProfile) {
            const cleanProfile = {
              ...updatedProfile,
              is_verified: updatedProfile.is_verified === true, 
              phone: updatedProfile.phone || updatedProfile.phone_number || updatedProfile.whatsapp_number || "",
            };
            
            console.log('✅ Perfil atualizado localmente:', cleanProfile);
            // Atualizar estado diretamente sem esperar pelo listener
            fetchProfileImmediate({
              is_verified: true,
              phone: fullPhone,
              phone_number: fullPhone,
              whatsapp_number: fullPhone
            });
          }
          
          toast.success('WhatsApp verificado com sucesso!');
          
          // Pequeno delay e redirecionamento
          setTimeout(() => {
            const returnToBooking = sessionStorage.getItem('returnToBooking');
            if (returnToBooking) {
              console.log('🔵 Retornando para agendamento...');
              sessionStorage.removeItem('returnToBooking');
              window.location.href = returnToBooking;
            } else {
              console.log('🔵 Redirecionando para /profile...');
              window.location.href = '/profile';
            }
          }, 500); // Reduzido para 500ms para resposta mais rápida
        } else {
          console.error("Erro ao salvar perfil:", profileError);
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
                <Label htmlFor="phone" className="text-sm font-medium mb-2 block">Seu WhatsApp</Label>
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
                
                <Button 
                  variant="ghost"
                  onClick={handleSkipVerification}
                  className="w-full h-11 text-muted-foreground hover:text-foreground"
                >
                  Verificar Depois
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
