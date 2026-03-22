import { supabase } from '@/integrations/supabase/client';

export interface ClientHomeBarber {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface ClientHomeSettings {
  hero_image_url: string | null;
  title: string;
  subtitle: string | null;
}

export async function fetchClientHomePage(establishmentId: string): Promise<{
  homeSettings: ClientHomeSettings | null;
  barbers: ClientHomeBarber[];
}> {
  const superadminEmail = import.meta.env.VITE_SUPERADMIN_EMAIL || '';

  const { data: estData } = await supabase
    .from('establishments')
    .select('name, hero_image_url, home_title, home_subtitle')
    .eq('id', establishmentId)
    .maybeSingle();

  let homeSettings: ClientHomeSettings | null = null;
  if (estData) {
    homeSettings = {
      hero_image_url: (estData as { hero_image_url?: string | null }).hero_image_url ?? null,
      title: ((estData as { home_title?: string | null }).home_title ?? estData.name ?? 'BookNow') as string,
      subtitle: ((estData as { home_subtitle?: string | null }).home_subtitle ?? null) as string | null,
    };
  }

  let query = supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('profile_role', ['BARBER', 'ADMIN_BARBER'] as string[]);
  if (superadminEmail) query = query.neq('email', superadminEmail);
  query = query.eq('establishment_id', establishmentId);
  const { data: barbersData, error: queryErr } = await query;

  if (queryErr && import.meta.env.DEV) console.error('Erro ao carregar profissionais:', queryErr);
  const barbers: ClientHomeBarber[] =
    barbersData && barbersData.length > 0 ? (barbersData as ClientHomeBarber[]) : [];

  return { homeSettings, barbers };
}
