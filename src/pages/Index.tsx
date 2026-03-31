import { useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEstablishment } from '@/hooks/useEstablishment';
import ClientHome from '@/components/client/ClientHome';
import BarberDashboard from '@/components/barber/BarberDashboard';
import TenantInvalidGate from '@/components/TenantInvalidGate';
import { Loader2 } from 'lucide-react';
import { AppBrandLogo } from '@/components/AppBrandLogo';

const SynapsesLanding = lazy(() => import('@/pages/SynapsesLanding'));

/** Rotas que montam esta página (evita redirect desnecessário se a rota mudar). */
const INDEX_PATHS = new Set(['/', '/auth/callback']);

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, loading, user } = useAuth();
  const {
    establishmentLoading,
    establishmentFetchError,
    isAgencyMainDomain,
    invalidTenantHostname,
  } = useEstablishment();

  useEffect(() => {
    if (loading) return;
    if (!INDEX_PATHS.has(location.pathname)) return;
    if (profile?.profile_role === 'SUPER_ADMIN') {
      navigate('/super-admin', { replace: true });
      return;
    }
    if (profile?.profile_role === 'BARBER') {
      navigate('/barber', { replace: true });
    }
  }, [profile?.profile_role, loading, navigate, location.pathname]);

  const bootScreen = (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-background px-6">
      <AppBrandLogo className="h-20 w-20 object-contain" />
      <Loader2 className="w-9 h-9 animate-spin text-primary" />
    </div>
  );

  const waitingAuthOrTenant = loading || establishmentLoading;

  if (waitingAuthOrTenant) {
    return bootScreen;
  }

  if (profile?.profile_role === 'SUPER_ADMIN') {
    return bootScreen;
  }

  if (profile?.profile_role === 'BARBER') {
    return bootScreen;
  }

  if (user && !profile) {
    return bootScreen;
  }

  if (establishmentFetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6">
        <p className="text-center text-muted-foreground max-w-md">
          Não foi possível carregar os dados da barbearia. Verifique a ligação e tente novamente.
        </p>
      </div>
    );
  }

  if (invalidTenantHostname) {
    return <TenantInvalidGate />;
  }

  // Domínio principal da agência → landing (visitantes e clientes sem papel de loja aqui)
  if (isAgencyMainDomain) {
    if (profile?.profile_role === 'ADMIN_BARBER') {
      return <BarberDashboard isAdmin />;
    }
    return (
      <Suspense fallback={bootScreen}>
        <SynapsesLanding />
      </Suspense>
    );
  }

  // Subdomínio synapses válido ou domínio próprio resolvido → home da barbearia
  if (profile?.profile_role === 'ADMIN_BARBER') {
    return <BarberDashboard isAdmin />;
  }

  return <ClientHome />;
}
