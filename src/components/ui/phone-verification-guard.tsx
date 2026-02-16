import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PhoneVerificationGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  message?: string;
}

export function PhoneVerificationGuard({ 
  children, 
  redirectTo = '/verify-phone',
  message = 'Você precisa verificar seu WhatsApp para continuar'
}: PhoneVerificationGuardProps) {
  const { user, loading, needsPhoneVerification } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading && needsPhoneVerification) {
      console.log('🚫 Usuário precisa verificar telefone, redirecionando...');
      toast.warning(message);
      navigate(redirectTo);
    }
  }, [user, loading, needsPhoneVerification, navigate, redirectTo, message]);

  // Se usuário logado mas precisa verificar telefone, não renderizar conteúdo
  if (user && needsPhoneVerification) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando telefone...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
