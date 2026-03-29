import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ClientHome from '@/components/client/ClientHome';
import BarberDashboard from '@/components/barber/BarberDashboard';
import { Loader2 } from 'lucide-react';
import { AppBrandLogo } from '@/components/AppBrandLogo';

/** Rotas que montam esta página (evita redirect desnecessário se a rota mudar). */
const INDEX_PATHS = new Set(['/', '/auth/callback']);

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, loading, user } = useAuth();

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

  if (loading) {
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

  // Dono da unidade: agenda profissional na home — não a home de cliente
  if (profile?.profile_role === 'ADMIN_BARBER') {
    return <BarberDashboard isAdmin />;
  }

  return <ClientHome />;
}
