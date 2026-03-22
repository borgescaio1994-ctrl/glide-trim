import { supabase } from '@/integrations/supabase/client';

/**
 * Valida o código na tabela phone_verifications.
 * Se válido: marca o código como usado (verified_at) e atualiza o perfil (número + is_verified).
 */
export async function validateAuthCode(phoneNumber: string, inputCode: string, userId?: string): Promise<boolean> {
  if (!phoneNumber || !inputCode) return false;

  try {
    const { data, error } = await supabase
      .from('phone_verifications')
      .select('id, verification_code, expires_at')
      .eq('phone_number', phoneNumber)
      .is('verified_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data || data.verification_code !== inputCode) return false;
    const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
    if (expiresAt && Date.now() > expiresAt) return false;

    const now = new Date().toISOString();

    if (userId) {
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .update({
          is_verified: true,
          phone: phoneNumber,
          phone_number: phoneNumber,
        })
        .eq('id', userId)
        .select('id')
        .maybeSingle();
      if (profileErr || !profileData) return false;
    }

    const { error: codeErr } = await supabase
      .from('phone_verifications')
      .update({ verified_at: now })
      .eq('id', data.id);
    if (codeErr) return false;

    return true;
  } catch {
    return false;
  }
}
