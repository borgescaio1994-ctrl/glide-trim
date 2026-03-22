import { useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEstablishment } from '@/api/establishment';
import { queryKeys } from '@/lib/queryKeys';
import type { Establishment } from '@/types/establishment';

export type { Establishment } from '@/types/establishment';

function isIpHostname(hostname: string) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  if (hostname.includes(':')) return true;
  return false;
}

/**
 * Extrai o slug da loja pelo domínio ou path.
 */
export function getSlugFromHostOrPath(): string | null {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname;

  const pathMatch = pathname.match(/^\/(?:e|estabelecimento)\/([a-z0-9-]+)/i);
  if (pathMatch) return pathMatch[1];

  if (hostname === 'localhost' || isIpHostname(hostname)) {
    if (import.meta.env.DEV) {
      const envSlug = import.meta.env.VITE_DEFAULT_ESTABLISHMENT_SLUG;
      if (envSlug && typeof envSlug === 'string') return envSlug;
    }
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length >= 2 && parts[0] && parts[0] !== 'www' && parts[0] !== 'app') {
    const slug = parts[0];
    if (slug.length > 1 && /^[a-z0-9-]+$/.test(slug)) return slug;
  }

  if (import.meta.env.DEV) {
    const envSlug = import.meta.env.VITE_DEFAULT_ESTABLISHMENT_SLUG;
    if (envSlug && typeof envSlug === 'string') return envSlug;
  }

  return null;
}

export function useEstablishment() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const hostname =
    typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const slugFromHost = useMemo(() => getSlugFromHostOrPath(), [location.pathname]);

  const estQuery = useQuery({
    queryKey: queryKeys.establishment(hostname, slugFromHost),
    queryFn: () => fetchEstablishment(slugFromHost),
  });

  const establishment: Establishment | null = estQuery.data?.establishment ?? null;
  const slug = establishment?.slug ?? estQuery.data?.resolvedSlug ?? slugFromHost;

  const refetch = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.establishment(hostname, slugFromHost),
    });
  }, [queryClient, hostname, slugFromHost]);

  return {
    establishment,
    establishmentDisplayName: establishment?.home_title?.trim() || establishment?.name || 'BookNow',
    establishmentId: establishment?.id ?? null,
    slug,
    loading: estQuery.isPending,
    refetch,
    getSlugFromHostOrPath,
  };
}
