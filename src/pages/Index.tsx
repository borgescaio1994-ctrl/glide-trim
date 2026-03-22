import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ClientHome from '@/components/client/ClientHome';
import BarberDashboard from '@/components/barber/BarberDashboard';
import { Loader2 } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.profile_role === 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.profile_role === 'BARBER') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Dono da unidade: agenda profissional na home — não a home de cliente
  if (profile?.profile_role === 'ADMIN_BARBER') {
    return <BarberDashboard isAdmin />;
  }

  return <ClientHome />;
}
