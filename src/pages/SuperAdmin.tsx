import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import SuperAdminCRM from '@/components/superadmin/SuperAdminCRM';

/**
 * SUPER_ADMIN: rota /super-admin renderiza apenas o CRM multi-tenant.
 */
export default function SuperAdmin() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = profile?.profile_role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!isSuperAdmin) {
      navigate('/');
    }
  }, [user, isSuperAdmin, navigate]);

  if (!user) return null;
  if (!isSuperAdmin) return null;

  return <SuperAdminCRM />;
}
