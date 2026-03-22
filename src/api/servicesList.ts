import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types/auth';

export interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  image_url?: string | null;
  image_name?: string | null;
}

export async function fetchServicesForProfile(profile: Profile): Promise<ServiceRow[]> {
  let query = supabase.from('services').select('*').order('created_at', { ascending: false });

  if (profile.profile_role === 'ADMIN_BARBER' && profile.establishment_id) {
    query = query.eq('establishment_id', profile.establishment_id);
  } else {
    query = query.eq('barber_id', profile.id);
  }

  const { data, error } = await query;
  if (error && import.meta.env.DEV) console.warn('fetchServicesForProfile:', error);
  return (data ?? []) as ServiceRow[];
}
