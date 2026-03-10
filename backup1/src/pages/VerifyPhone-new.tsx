import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { validateAuthCode } from '@/lib/authUtils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Smartphone, MessageSquare, Shield } from 'lucide-react';

export default function VerifyPhone() {
  const { user, fetchProfile } = useAuth();
  const navigate = useNavigate();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  // Verificar se já tem telefone no localStorage
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
      // Gerar código de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);

      // Formatar telefone
      const digits = phoneNumber.replace(/\D/g, '');
      const fullPhone = digits.length === 11 ? `55${digits}` : digits;

      // Salvar telefone no localStorage
      localStorage.setItem('pending_phone', phoneNumber);

      console.log('📱 Enviando código:', { phone: fullPhone, code });
      
      // Chamar Edge Function
      const response = await fetch('https://rubvkpxvgffmnloaxbqa.supabase.co/functions/v1/send-whatsapp-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YnZrcHh2Z2ZtbmxvYXhicWEiLCJ0eXBlIjoiYXBpIiwicm9sZSI6ImFub24iLCJhdWQiOlsidXJsIiwidXJsLmFwaSIsInVybC5mdW5jdGlvbiJdLCJleHAiOjE5NzQ4MDI4ODJ9.7p_qxQa3QkZQIGxLjKz3vHkW8mNqRrNqRrNqRrNqRrNq'
        },
        body: JSON.stringify({
          phone: fullPhone,
          code: code
        })
      });

      if (response.ok) {
        setCodeSent(true);
        toast.success('Código enviado para seu WhatsApp!');
      } else {
        // Fallback: mostrar código na tela
        setCodeSent(true);
        toast.warning('Use o código na tela: ' + code);
      }

    } catch (error) {
      console.error('❌ Erro ao enviar código:', error);
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
      console.log('🔍 Iniciando verificação...');
      
      const pendingPhone = localStorage.getItem('pending_phone');
      if (!pendingPhone) {
        toast.error('Telefone não encontrado');
        return;
      }

      const digits = pendingPhone.replace(/\D/g, '');
      const fullPhone = digits.length === 11 ? `55${digits}` : digits;
      const cleanCode = verificationCode.trim();

      console.log('📱 Dados da verificação:', { fullPhone, cleanCode, userId: user.id });

      // Validar código e atualizar perfil
      const success = await validateAuthCode(fullPhone, cleanCode, user.id);
      
      console.log('🔍 Resultado da validação:', success);

      if (success) {
        toast.success('WhatsApp verificado com sucesso!');
        
        // Limpar localStorage
        localStorage.removeItem('pending_phone');
        
        // Atualizar perfil local
        await fetchProfile(user.id);
        
        // Redirecionar
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        toast.error('Código incorreto ou expirado');
      }
    } catch (error) {
      console.error('❌ Erro na verificação:', error);
      toast.error('Erro na verificação. Tente novamente.');
    } finally {
      setVerifyingCode(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            className="mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Verificar WhatsApp</h1>
        </div>

        {/* Content */}
        <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Proteja sua conta</h2>
            <p className="text-gray-400 text-sm">
              Enviamos um código para seu WhatsApp para verificar seu número
            </p>
          </div>

          {!codeSent ? (
            // Formulário de telefone
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Smartphone className="inline h-4 w-4 mr-2" />
                  Número do WhatsApp
                </label>
                <Input
                  type="tel"
                  placeholder="(11) 91560-5439"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  maxLength={15}
                />
              </div>
              
              <Button 
                onClick={handleSendCode}
                disabled={verifyingPhone}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {verifyingPhone ? 'Enviando...' : 'Enviar Código'}
              </Button>
            </div>
          ) : (
            // Formulário de código
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <MessageSquare className="inline h-4 w-4 mr-2" />
                  Código de verificação
                </label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="bg-gray-700 border-gray-600 text-white text-center text-2xl tracking-widest"
                  maxLength={6}
                />
                <p className="text-xs text-gray-400 mt-2">
                  Digite o código de 6 dígitos enviado para {phoneNumber}
                </p>
              </div>
              
              <Button 
                onClick={handleVerifyCode}
                disabled={verifyingCode}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {verifyingCode ? 'Verificando...' : 'Verificar Código'}
              </Button>

              <Button 
                variant="outline"
                onClick={() => {
                  setCodeSent(false);
                  setVerificationCode('');
                }}
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Usar outro número
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
