import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import ClientHome from '@/components/client/ClientHome';
import BarberDashboard from '@/components/barber/BarberDashboard';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  // Admin and barber both use BarberDashboard, but admin has extra panel button
  return profile.role === 'barber' ? <BarberDashboard isAdmin={isAdmin} /> : <ClientHome />;
}
