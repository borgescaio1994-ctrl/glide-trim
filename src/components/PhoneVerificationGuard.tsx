import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { isDeferred } from '@/lib/verificationStorage';
import { fetchEstablishmentSubscription } from '@/api/establishment';
import { queryKeys } from '@/lib/queryKeys';

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

  const subscriptionQuery = useQuery({
    queryKey: queryKeys.establishmentSubscription(profile?.establishment_id),
    queryFn: () => fetchEstablishmentSubscription(profile!.establishment_id!),
    enabled:
      !!profile?.establishment_id &&
      profile.profile_role === 'ADMIN_BARBER' &&
      !loading &&
      pathname !== PATH_AUTH,
  });

  useEffect(() => {
    if (loading) return;

    // Na tela de login: não aplicar verificação de telefone nem assinatura (evita corrida com redirect do Auth).
    if (pathname === PATH_AUTH) return;

    if (isPublicPath(pathname) && !user) return;
    if (!user) {
      navigate(PATH_AUTH, { replace: true });
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
      if (subscriptionQuery.isPending) return;
      if (
        subscriptionQuery.data?.subscription_status === false &&
        pathname !== PATH_SUBSCRIPTION_PENDING
      ) {
        navigate(PATH_SUBSCRIPTION_PENDING, { replace: true });
      }
    }
  }, [
    loading,
    user,
    profile?.establishment_id,
    profile?.profile_role,
    pathname,
    needsPhoneVerification,
    navigate,
    subscriptionQuery.isPending,
    subscriptionQuery.data?.subscription_status,
  ]);

  if (!user && !isPublicPath(pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
