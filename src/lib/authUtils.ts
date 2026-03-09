import { supabase } from '@/integrations/supabase/client';

/**
 * Valida o código e retorna booleano
 * A gravação do perfil é feita pelo fetchProfileImmediate no useAuth
 */
export async function validateAuthCode(phoneNumber: string, inputCode: string, userId?: string): Promise<boolean> {
  console.log('🔍 [authUtils] Iniciando validação rigorosa...');
  
  try {
    // 1. Busca o código mais recente
    const { data, error } = await supabase
      .from('phone_verifications')
      .select('verification_code, expires_at')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.error('❌ [authUtils] Código não encontrado no banco:', error);
      return false;
    }

    // 2. Checa expiração
    if (new Date(data.expires_at) < new Date()) {
      console.error('❌ [authUtils] Código expirado');
      return false;
    }

    // 3. Valida o código digitado
    const isValid = data.verification_code === inputCode;
    
    if (isValid) {
      console.log('✅ [authUtils] Código correto! A gravação do perfil será feita pelo fetchProfileImmediate.');
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ [authUtils] Erro inesperado:', error);
    return false;
  }
}