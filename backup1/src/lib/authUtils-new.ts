import { supabase } from '@/integrations/supabase/client';

/**
 * Valida o código de autenticação e atualiza o perfil
 * Versão simplificada e direta sem bugs
 */
export async function validateAuthCode(phoneNumber: string, inputCode: string, userId?: string): Promise<boolean> {
  console.log('🔍 validateAuthCode iniciado');
  console.log('  - phoneNumber:', phoneNumber);
  console.log('  - inputCode:', inputCode);
  console.log('  - userId:', userId);
  
  try {
    // 1. Buscar código mais recente para este telefone
    const { data, error } = await supabase
      .from('phone_verifications')
      .select('verification_code, expires_at')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.log('❌ Código não encontrado:', error);
      return false;
    }

    // 2. Verificar expiração
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    
    if (expiresAt < now) {
      console.log('❌ Código expirou');
      return false;
    }

    // 3. Validar código
    const isValid = data.verification_code === inputCode;
    console.log('🔍 Código válido:', isValid);

    if (isValid && userId) {
      // 4. Atualizar perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          is_verified: true, 
          phone: phoneNumber,
          whatsapp_number: phoneNumber 
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('❌ Erro ao atualizar perfil:', updateError);
        return false;
      }
      
      console.log('✅ Perfil atualizado com sucesso');
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ Erro na validação:', error);
    return false;
  }
}
