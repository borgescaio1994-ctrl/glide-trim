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

      // 1. LIMPAR REGISTROS ANTIGOS DESTE USUÁRIO
      console.log('🔥 [LIMPEZA] Removendo registros antigos...');
      const { error: cleanError } = await supabase
        .from('phone_verifications')
        .delete()
        .eq('phone_number', fullPhone);

      if (cleanError) {
        console.log('🔥 [LIMPEZA] Erro ao limpar (não crítico):', cleanError);
      }

      // 2. INSERIR NOVO REGISTRO NA TABELA EXISTENTE
      console.log('🔥 [INSERT] Inserindo nova solicitação...');
      const { error: insertError } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: fullPhone,
          verification_code: code,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        });

      if (insertError) {
        console.error('❌ Erro ao salvar solicitação:', insertError);
        toast.error('Erro ao gerar código. Tente novamente.');
        setVerifyingPhone(false);
        return;
      }

      console.log('✅ Solicitação de verificação criada com sucesso!');
      console.log('✅ Código gerado:', code);
      
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
          console.warn('⚠️ Erro ao enviar WhatsApp, mas código foi salvo');
        }
      } catch (funcError) {
        console.warn('⚠️ Erro ao enviar WhatsApp, mas código foi salvo:', funcError);
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
    console.log('🔥 [INÍCIO] VERIFICAÇÃO DE CÓDIGO - NOVA LÓGICA');
    console.log('🔥 [ESTADO] verifyingCode:', verifyingCode);
    console.log('🔥 [USUÁRIO] user?.id:', user?.id);
    
    if (verifyingCode || !user?.id) {
      console.log('🔥 [BLOQUEIO] Retornando early');
      return;
    }
    
    setVerifyingCode(true);

    try {
      const fullPhone = localStorage.getItem('pending_phone') || phoneNumber.replace(/\D/g, '');
      const cleanCode = verificationCode.trim();
      
      console.log('🔥 [DADOS] fullPhone:', fullPhone);
      console.log('🔥 [DADOS] cleanCode:', cleanCode);
      
      // 1. VALIDAÇÃO BÁSICA
      if (!cleanCode || cleanCode.length !== 6) {
        console.log('🔥 [ERRO] Código inválido:', cleanCode);
        toast.error('Digite o código de 6 dígitos');
        return;
      }
      
      // 2. BUSCAR REGISTRO DO USUÁRIO
      console.log('🔥 [BUSCA] Buscando registro de verificação...');
      const { data: verificationRecord, error: fetchError } = await supabase
        .from('phone_verifications')
        .select('*')
        .eq('phone_number', fullPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        console.log('🔥 [ERRO] Registro não encontrado:', fetchError);
        toast.error('Código não encontrado. Solicite um novo código.');
        return;
      }

      console.log('🔥 [SUCESSO] Registro encontrado:', verificationRecord);
      
      // 3. VERIFICAR EXPIRAÇÃO
      if (new Date() > new Date(verificationRecord.expires_at)) {
        console.log('🔥 [ERRO] Código expirado!');
        toast.error('Código expirado. Solicite um novo código.');
        return;
      }
      
      // 4. COMPARAR CÓDIGOS
      if (cleanCode !== verificationRecord.verification_code) {
        console.log('🔥 [ERRO] Código incorreto!');
        console.log('🔥 [DIGITADO]', cleanCode);
        console.log('🔥 [ESPERADO]', verificationRecord.verification_code);
        toast.error('Código incorreto. Tente novamente.');
        return;
      }

      console.log('✅ [SUCESSO] Código correto!');

      // 5. ATUALIZAR PERFIL DO USUÁRIO
      console.log('🔥 [PERFIL] Atualizando perfil do usuário...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          phone_number: fullPhone,
          is_verified: true
        })
        .eq('id', user.id);

      if (profileError) {
        console.log('🔥 [ERRO] Erro ao atualizar perfil:', profileError);
        toast.error('Erro ao salvar número. Tente novamente.');
        return;
      }

      // 6. LIMPAR REGISTRO DE VERIFICAÇÃO
      console.log('🔥 [LIMPEZA] Removendo registro de verificação...');
      await supabase
        .from('phone_verifications')
        .delete()
        .eq('id', verificationRecord.id);

      console.log('✅ [SUCESSO] TUDO CERTO!');
      
      // 6. LIMPAR E REDIRECIONAR
      localStorage.removeItem('pending_phone');
      toast.success('WhatsApp verificado com sucesso!');
      
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      
    } catch (error) {
      console.log('🔥 [ERRO] Erro inesperado:', error);
      toast.error('Erro ao verificar. Tente novamente.');
    } finally {
      setVerifyingCode(false);
      console.log('🔥 [FIM] Processo finalizado');
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
