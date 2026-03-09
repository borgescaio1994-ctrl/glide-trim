import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface PhoneVerificationGuardProps {
  children: React.ReactNode;
}

export default function PhoneVerificationGuard({ children }: PhoneVerificationGuardProps) {
  const { user, profile, loading, needsPhoneVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. Se o sistema ainda está buscando os dados do banco, não faz nada
    if (loading) return;

    const path = location.pathname;

    // 2. Lógica para usuário deslogado
    if (!user) {
      if (path !== '/auth') {
        console.log('🛡️ Guard: Usuário não autenticado, redirecionando para /auth');
        navigate('/auth');
      }
      return;
    }

    // 3. A REGRA DE OURO: Evitar o looping na tela de verificação
    if (needsPhoneVerification) {
      // Se ele precisa verificar, mas já está na página de verificação, DEIXA ELE LÁ
      if (path === '/verify-phone' || path === '/auth') {
        return; 
      }
      
      // Se ele tentar acessar a Home ou outra página sem verificar, bloqueia e manda de volta
      console.log('🛡️ Guard: Acesso negado. Necessário verificar WhatsApp.');
      navigate('/verify-phone');
      return;
    }

    // 4. Se o usuário JÁ VERIFICOU e ainda está na tela de verificação, tira ele de lá
    if (!needsPhoneVerification && path === '/verify-phone') {
      console.log('🛡️ Guard: Verificação concluída, liberando acesso à Home.');
      navigate('/');
    }

  }, [user, profile, loading, navigate, location.pathname, needsPhoneVerification]);

  // Enquanto o loading for true, mostramos o spinner para evitar "piscadas" de tela
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Sincronizando perfil...</p>
        </div>
      </div>
    );
  }

  // Se o usuário não está logado e não está na tela de login, não renderiza nada até o redirecionamento
  if (!user && location.pathname !== '/auth') {
    return null;
  }

  // Se precisar de verificação e não estiver na página certa, esconde o conteúdo (children)
  if (needsPhoneVerification && location.pathname !== '/verify-phone') {
    return null;
  }

  return <>{children}</>;
}