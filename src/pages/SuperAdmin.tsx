import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import SuperAdminCRM from '@/components/superadmin/SuperAdminCRM';

/**
 * SUPER_ADMIN: rota /super-admin renderiza apenas o CRM multi-tenant.
 */
export default function SuperAdmin() {
  const { profile, user, loading } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = profile?.profile_role === 'SUPER_ADMIN';

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (!isSuperAdmin) {
      navigate('/', { replace: true });
    }
  }, [user, isSuperAdmin, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!isSuperAdmin) return null;

  return <SuperAdminCRM />;
}
