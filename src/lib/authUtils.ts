import { supabase } from '@/integrations/supabase/client';

/**
 * Valida o código na tabela phone_verifications (colunas: verification_code, verified_at).
 * Se válido, marca o código como usado (verified_at) e, se userId for passado, atualiza o perfil.
 */
export async function validateAuthCode(
  phoneNumber: string,
  inputCode: string,
  userId?: string
): Promise<boolean> {
  try {
    const { data: verification, error: fetchError } = await supabase
      .from('phone_verifications')
      .select('id')
      .eq('phone_number', phoneNumber)
      .eq('verification_code', inputCode)
      .is('verified_at', null)
      .gte('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (fetchError || !verification) {
      return false;
    }

    await supabase
      .from('phone_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verification.id);

    if (userId) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_verified: true,
          phone: phoneNumber,
          phone_number: phoneNumber,
          whatsapp_number: phoneNumber,
        })
        .eq('id', userId);

      if (profileError) return false;
    }

    return true;
  } catch {
    return false;
  }
}
