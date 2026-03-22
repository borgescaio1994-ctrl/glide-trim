import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isDeferred } from '@/lib/verificationStorage';
import { supabase } from '@/integrations/supabase/client';

const PATH_AUTH = '/auth';
const PATH_VERIFY_PHONE = '/verify-phone';
const PATH_SUBSCRIPTION_PENDING = '/assinatura-pendente';

function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === PATH_AUTH ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/barber/')
  );
}

interface PhoneVerificationGuardProps {
  children: React.ReactNode;
}

/**
 * Guard só redireciona para /verify-phone quando o usuário está na HOME (/).
 * Nunca redireciona quando está em /profile, /appointments ou /verify-phone.
 * Assim, após verificar com sucesso e ir para /profile, não há loop.
 */
export default function PhoneVerificationGuard({ children }: PhoneVerificationGuardProps) {
  const { user, profile, loading, needsPhoneVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    if (loading) return;

    if (isPublicPath(pathname) && !user) return;
    if (!user) {
      navigate(PATH_AUTH);
      return;
    }

    if (pathname === PATH_VERIFY_PHONE) return;
    if (pathname === PATH_SUBSCRIPTION_PENDING) return;
    if (pathname === '/profile' || pathname === '/appointments') return;
    if (pathname === '/super-admin' || pathname.startsWith('/super-admin/')) return;

    // Primeiro: verificação de telefone — evita corrida com assinatura/inadimplência.
    const mustVerify = needsPhoneVerification && !isDeferred();
    if (mustVerify && (pathname === '/' || pathname === '/barber')) {
      navigate(PATH_VERIFY_PHONE, { replace: true });
      return;
    }

    // Trava de inadimplência: só ADMIN_BARBER (dono).
    if (profile?.establishment_id && profile.profile_role === 'ADMIN_BARBER') {
      void (async () => {
        const { data } = await supabase
          .from('establishments')
          .select('subscription_status')
          .eq('id', profile.establishment_id)
          .maybeSingle();
        if (data && data.subscription_status === false) {
          navigate(PATH_SUBSCRIPTION_PENDING, { replace: true });
        }
      })();
    }
  }, [loading, user, profile?.establishment_id, profile?.profile_role, pathname, needsPhoneVerification, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user && !isPublicPath(pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
