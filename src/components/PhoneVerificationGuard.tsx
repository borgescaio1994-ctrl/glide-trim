import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface PhoneVerificationGuardProps {
  children: React.ReactNode;
}

export default function PhoneVerificationGuard({ children }: PhoneVerificationGuardProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Se está carregando, aguarda
    if (loading) return;

    // Se não há usuário, vai para login (mas não se já estiver na página de auth)
    if (!user) {
      if (location.pathname === '/auth') return;
      navigate('/auth');
      return;
    }

    // Se já está na página de verificação, não faz nada
    if (location.pathname === '/verify-phone') return;

    // Se precisa verificar telefone, redireciona automaticamente após login
    if (user && profile && !(profile.is_verified || profile.phone_verified)) {
      console.log('🔵 Usuário precisa verificar telefone, redirecionando...');
      
      // Redireciona automaticamente para verificação
      navigate('/verify-phone');
      return;
    }
  }, [user, profile, loading, navigate, location.pathname]);

  // Se está carregando, mostra spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não há usuário e não está na página de auth, vai para login
  if (!user && location.pathname !== '/auth') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Renderiza children sem interferência
  return <>{children}</>;
}
