import { useAuth } from '@/hooks/useAuth';
import ClientHome from '@/components/client/ClientHome';
import BarberDashboard from '@/components/barber/BarberDashboard';
import AdminHome from '@/components/admin/AdminHome';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { profile, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is admin (owner), show admin home
  if (isAdmin) {
    return <AdminHome />;
  }

  // If user is a barber, show barber dashboard
  if (profile?.role === 'barber') {
    return <BarberDashboard isAdmin={false} />;
  }

  // For everyone else (clients or not logged in), show public home
  return <ClientHome />;
}
