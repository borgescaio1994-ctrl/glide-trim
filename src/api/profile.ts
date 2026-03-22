import { supabase } from '@/integrations/supabase/client';
import { clearSupabaseAuthStorage, isSessionLikeAuthError } from '@/lib/authStorage';
import type { Profile, ProfileRole } from '@/types/auth';

const PROFILE_FETCH_TIMEOUT_MS = Number(import.meta.env.VITE_PROFILE_FETCH_TIMEOUT_MS ?? 120000);

/** Mapeia linha do PostgREST para o tipo Profile */
export function mapRowToProfile(data: Record<string, unknown>): Profile {
  return {
    id: data.id as string,
    email: data.email as string,
    full_name: (data.full_name as string) || '',
    role: (data.role as Profile['role']) || 'client',
    profile_role: (data.profile_role as ProfileRole) || 'CUSTOMER',
    establishment_id: (data.establishment_id as string | null) ?? null,
    is_verified: !!data.is_verified,
    phone: (data.phone as string) || (data.phone_number as string) || '',
    avatar_url: (data.avatar_url as string | null | undefined) ?? null,
    phone_number: (data.phone_number as string | null | undefined) ?? null,
    whatsapp_number: (data.whatsapp_number as string | null | undefined) ?? null,
    phone_verified: (data.phone_verified as boolean | null | undefined) ?? null,
  };
}

export async function fetchProfileByUserId(userId: string): Promise<Profile | null> {
  const queryPromise = supabase.from('profiles').select('*').eq('id', userId).single();
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('PROFILE_FETCH_TIMEOUT')), PROFILE_FETCH_TIMEOUT_MS)
  );

  let raced: Awaited<typeof queryPromise>;
  try {
    raced = await Promise.race([queryPromise, timeoutPromise]);
  } catch (e) {
    if (e instanceof Error && e.message === 'PROFILE_FETCH_TIMEOUT') throw e;
    throw e;
  }

  const { data, error } = raced;
  if (error || !data) {
    if (
      error &&
      (isSessionLikeAuthError(error) ||
        /jwt|not authorized|permission denied|invalid/i.test(String((error as { message?: string }).message ?? '')))
    ) {
      clearSupabaseAuthStorage();
      await supabase.auth.signOut();
      throw error;
    }
    return null;
  }
  return mapRowToProfile(data as Record<string, unknown>);
}
