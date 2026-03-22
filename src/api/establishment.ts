import { supabase } from '@/integrations/supabase/client';
import type { Establishment } from '@/types/establishment';

export async function fetchEstablishmentSubscription(establishmentId: string) {
  const { data } = await supabase
    .from('establishments')
    .select('subscription_status')
    .eq('id', establishmentId)
    .maybeSingle();
  return data as { subscription_status: boolean | null } | null;
}

function isIpHostname(hostname: string) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  if (hostname.includes(':')) return true;
  return false;
}

export type EstablishmentFetchResult = {
  establishment: Establishment | null;
  resolvedSlug: string | null;
};

export async function fetchEstablishment(slugOrId: string | null): Promise<EstablishmentFetchResult> {
  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';

  if (hostname && hostname !== 'localhost' && !isIpHostname(hostname)) {
    const hostNoWww = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
    const { data: byDomain, error: domainErr } = await supabase
      .from('establishments')
      .select(
        'id, name, slug, home_title, logo_url, primary_color, custom_domain, status, whatsapp_sender_phone, ui_theme'
      )
      .eq('status', true)
      .ilike('custom_domain', hostNoWww)
      .maybeSingle();

    if (domainErr) throw domainErr;
    if (byDomain) {
      const est = byDomain as Establishment;
      return { establishment: est, resolvedSlug: est.slug };
    }
  }

  if (!slugOrId) {
    return { establishment: null, resolvedSlug: null };
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
  const { data, error } = await supabase
    .from('establishments')
    .select(
      'id, name, slug, home_title, logo_url, primary_color, custom_domain, status, whatsapp_sender_phone, ui_theme'
    )
    .eq('status', true)
    .or(isUuid ? `id.eq.${slugOrId}` : `slug.eq.${slugOrId}`)
    .maybeSingle();

  if (error || !data) {
    return { establishment: null, resolvedSlug: slugOrId };
  }
  const est = data as Establishment;
  return { establishment: est, resolvedSlug: est.slug };
}
