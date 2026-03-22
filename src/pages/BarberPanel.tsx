import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import BarberDashboard from '@/components/barber/BarberDashboard';
import { Loader2 } from 'lucide-react';

/**
 * Painel do profissional (role BARBER): agenda e atalhos; não é a página pública /barber/:id.
 */
export default function BarberPanel() {
  const { profile, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (profile?.profile_role && profile.profile_role !== 'BARBER') {
      navigate('/', { replace: true });
    }
  }, [loading, user, profile?.profile_role, navigate]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (profile.profile_role !== 'BARBER') {
    return null;
  }

  return <BarberDashboard isAdmin={false} />;
}
