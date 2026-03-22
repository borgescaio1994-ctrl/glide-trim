import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Establishment {
  id: string;
  name: string;
  slug: string;
  home_title?: string | null;
  logo_url: string | null;
  primary_color: string | null;
  custom_domain?: string | null;
  status: boolean;
  /** WhatsApp do dono/unidade (n8n / botão flutuante) */
  whatsapp_sender_phone?: string | null;
}

function isIpHostname(hostname: string) {
  // IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  // IPv6 (very loose)
  if (hostname.includes(':')) return true;
  return false;
}

/**
 * Extrai o slug da loja pelo domínio ou path.
 * Ex: minha-loja.duckdns.org -> "minha-loja"
 *     www.xxx.com -> usa path /e/minha-loja ou primeiro segmento do hostname
 */
function getSlugFromHostOrPath(): string | null {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname;

  // Path explícito: /e/:slug ou /estabelecimento/:slug
  const pathMatch = pathname.match(/^\/(?:e|estabelecimento)\/([a-z0-9-]+)/i);
  if (pathMatch) return pathMatch[1];

  // Se estiver acessando por IP/localhost, não tente extrair slug do host
  if (hostname === 'localhost' || isIpHostname(hostname)) {
    // Fallback: variável de ambiente (apenas para desenvolvimento)
    if (import.meta.env.DEV) {
      const envSlug = import.meta.env.VITE_DEFAULT_ESTABLISHMENT_SLUG;
      if (envSlug && typeof envSlug === 'string') return envSlug;
    }
    return null;
  }

  // Subdomínio ou host com slug no início: minha-loja.duckdns.org
  const parts = hostname.split('.');
  if (parts.length >= 2 && parts[0] && parts[0] !== 'www' && parts[0] !== 'app') {
    const slug = parts[0];
    if (slug.length > 1 && /^[a-z0-9-]+$/.test(slug)) return slug;
  }

  // Fallback: variável de ambiente (desenvolvimento)
  if (import.meta.env.DEV) {
    const envSlug = import.meta.env.VITE_DEFAULT_ESTABLISHMENT_SLUG;
    if (envSlug && typeof envSlug === 'string') return envSlug;
  }

  return null;
}

export function useEstablishment() {
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState<string | null>(null);

  const load = useCallback(async (slugOrId: string | null) => {
    setLoading(true);
    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';

      // 1) Prioridade: domínio customizado (anti-mistura)
      if (hostname && hostname !== 'localhost' && !isIpHostname(hostname)) {
        const hostNoWww = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
        const { data: byDomain, error: domainErr } = await supabase
          .from('establishments')
          .select(
            'id, name, slug, home_title, logo_url, primary_color, custom_domain, status, whatsapp_sender_phone'
          )
          .eq('status', true)
          .ilike('custom_domain', hostNoWww)
          .maybeSingle();

        if (domainErr) throw domainErr;
        if (byDomain) {
          setEstablishment(byDomain as Establishment);
          setSlug((byDomain as any).slug);
          setLoading(false);
          return byDomain as Establishment;
        }
      }

      // 2) Fallback: slug/id (subdomínio ou path)
      if (!slugOrId) {
        setEstablishment(null);
        setSlug(null);
        setLoading(false);
        return null;
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
      const { data, error } = await supabase
        .from('establishments')
        .select(
          'id, name, slug, home_title, logo_url, primary_color, custom_domain, status, whatsapp_sender_phone'
        )
        .eq('status', true)
        .or(isUuid ? `id.eq.${slugOrId}` : `slug.eq.${slugOrId}`)
        .maybeSingle();

      if (error || !data) {
        setEstablishment(null);
        setSlug(slugOrId);
        setLoading(false);
        return null;
      }
      setEstablishment(data as Establishment);
      setSlug((data as any).slug);
      setLoading(false);
      return data as Establishment;
    } catch {
      setEstablishment(null);
      setSlug(slugOrId);
      setLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    const slugFromHost = getSlugFromHostOrPath();
    setSlug(slugFromHost);
    load(slugFromHost);
  }, [load]);

  const refetch = useCallback(() => {
    const s = getSlugFromHostOrPath() || slug;
    return load(s);
  }, [load, slug]);

  return {
    establishment,
    establishmentDisplayName: establishment?.home_title?.trim() || establishment?.name || 'BookNow',
    establishmentId: establishment?.id ?? null,
    slug,
    loading,
    refetch,
    getSlugFromHostOrPath,
  };
}
