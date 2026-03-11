import { supabase } from '@/integrations/supabase/client';

/**
 * Valida o código na tabela phone_verifications (colunas: verification_code, verified_at).
 * Se válido, marca o código como usado (verified_at) e, se userId for passado, atualiza o perfil.
 */
export async function validateAuthCode(phoneNumber: string, inputCode: string, userId?: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('phone_verifications')
      .select('verification_code, expires_at')
      .eq('phone_number', phoneNumber)
      .is('verified_at', null) // Só códigos não usados
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data || data.verification_code !== inputCode) return false;

    if (userId) {
      // Atualiza o perfil E marca o código como usado na mesma transação lógica
      await supabase.from('profiles').update({ 
        is_verified: true, 
        phone: phoneNumber 
      }).eq('id', userId);
      
      await supabase.from('phone_verifications').update({ 
        verified_at: new Date().toISOString() 
      }).eq('phone_number', phoneNumber).eq('verification_code', inputCode);
    }
    return true;
  } catch { return false; }
}
