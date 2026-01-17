import { supabase } from '@/integrations/supabase/client';

/**
 * Valida o código de autenticação comparando com o verification_code armazenado no perfil do usuário.
 *
 * @param phoneNumber - Número de telefone limpo (só números)
 * @param inputCode - Código digitado pelo usuário
 * @returns Promise<boolean> - true se o código for válido, false caso contrário
 */
export async function validateAuthCode(phoneNumber: string, inputCode: string): Promise<boolean> {
  try {
    // Buscar o perfil onde o telefone corresponde
    const { data, error } = await supabase
      .from('profiles')
      .select('verification_code')
      .eq('phone', phoneNumber)
      .single();

    if (error) {
      console.error('Erro ao buscar perfil para validação:', error);
      return false;
    }

    if (!data) {
      console.log('Perfil não encontrado para o telefone:', phoneNumber);
      return false;
    }

    // Comparar o código
    const isValid = data.verification_code === inputCode;

    if (isValid) {
      console.log('Código de autenticação válido para telefone:', phoneNumber);
    } else {
      console.log('Código de autenticação inválido para telefone:', phoneNumber);
    }

    return isValid;
  } catch (error) {
    console.error('Erro inesperado na validação do código:', error);
    return false;
  }
}