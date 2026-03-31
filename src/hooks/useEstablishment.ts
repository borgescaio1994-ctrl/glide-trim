import { useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEstablishment } from '@/api/establishment';
import { queryKeys } from '@/lib/queryKeys';
import {
  getTenantSlugFromSynapseHostname,
  isSynapseAgencyMainDomain,
  isCustomDomainHostname,
} from '@/lib/tenantHostname';
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

  const fromSynapse = getTenantSlugFromSynapseHostname(hostname);
  if (fromSynapse) return fromSynapse;

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

  const isAgencyMainDomain = useMemo(() => isSynapseAgencyMainDomain(hostname), [hostname]);

  const estQuery = useQuery({
    queryKey: queryKeys.establishment(hostname, slugFromHost),
    queryFn: () => fetchEstablishment(slugFromHost),
    enabled: !isAgencyMainDomain,
  });

  const establishment: Establishment | null = estQuery.data?.establishment ?? null;
  const slug = establishment?.slug ?? estQuery.data?.resolvedSlug ?? slugFromHost;

  const synapseSlug = useMemo(() => getTenantSlugFromSynapseHostname(hostname), [hostname]);

  /** Hostname exige loja no Supabase (subdomínio synapses ou domínio próprio), mas não encontrou registo ativo. */
  const invalidTenantHostname = useMemo(() => {
    if (isAgencyMainDomain) return false;
    if (!estQuery.isSuccess) return false;
    if (establishment) return false;
    return synapseSlug !== null || isCustomDomainHostname(hostname);
  }, [
    isAgencyMainDomain,
    estQuery.isSuccess,
    establishment,
    synapseSlug,
    hostname,
  ]);

  const establishmentLoading = !isAgencyMainDomain && estQuery.isPending;

  const establishmentFetchError = !isAgencyMainDomain && estQuery.isError;

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
    establishmentLoading,
    establishmentFetchError,
    isAgencyMainDomain,
    invalidTenantHostname,
    refetch,
    getSlugFromHostOrPath,
  };
}
