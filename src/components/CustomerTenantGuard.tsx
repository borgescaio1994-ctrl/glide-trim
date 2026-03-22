import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEstablishment } from '@/hooks/useEstablishment';
import { useToast } from '@/contexts/ToastContext';

/**
 * Cliente (CUSTOMER): conta vinculada a uma única unidade.
 * - Sem establishment_id no perfil (legado): vincula à loja atual na primeira visita.
 * - Com establishment_id: se acessar outra loja (domínio/slug), encerra sessão.
 */
export default function CustomerTenantGuard() {
  const { user, profile, loading, signOut, fetchProfile } = useAuth();
  const { establishmentId, loading: estLoading } = useEstablishment();
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const bindingRef = useRef(false);
  const mismatchHandledRef = useRef(false);

  useEffect(() => {
    if (loading || estLoading) return;
    if (!user || !profile) return;
    if (profile.profile_role !== 'CUSTOMER') return;
    if (!establishmentId) return;

    const pid = profile.establishment_id;

    if (!pid) {
      if (bindingRef.current) return;
      bindingRef.current = true;
      void (async () => {
        const { error } = await supabase
          .from('profiles')
          .update({ establishment_id: establishmentId })
          .eq('id', user.id);
        if (error) {
          bindingRef.current = false;
          if (import.meta.env.DEV) console.warn('[CustomerTenantGuard] bind establishment:', error);
          return;
        }
        await fetchProfile(user.id);
      })();
      return;
    }

    if (pid !== establishmentId) {
      if (mismatchHandledRef.current) return;
      mismatchHandledRef.current = true;
      void (async () => {
        await signOut();
        toastError('Esta conta pertence a outra unidade. Entre pelo link ou site da sua loja.');
        navigate('/auth', { replace: true });
      })();
    }
  }, [loading, estLoading, user, profile, establishmentId, signOut, navigate, toastError, fetchProfile]);

  return null;
}
