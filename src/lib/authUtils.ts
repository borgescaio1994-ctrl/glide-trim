import { supabase } from '@/integrations/supabase/client';

/**
 * Valida o código de autenticação comparando com a tabela phone_verifications.
 * Se válido, atualiza o perfil do cliente para 'is_verified: true' e salva o telefone.
 */
export async function validateAuthCode(phoneNumber: string, inputCode: string, userId?: string): Promise<boolean> {
  console.log('🔍 validateAuthCode iniciado (versão PRODUÇÃO)');
  console.log('  - phoneNumber:', phoneNumber);
  console.log('  - inputCode:', inputCode);
  console.log('  - userId:', userId);
  
  try {
    // 1. Buscar código válido no banco
    const { data: verification, error: fetchError } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', inputCode)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Erro ao buscar verificação:', fetchError);
      return false;
    }

    if (!verification) {
      console.error('❌ Código não encontrado ou inválido');
      return false;
    }

    console.log('✅ Código válido encontrado:', verification.id);

    // 2. Marcar código como usado
    const { error: updateError } = await supabase
      .from('phone_verifications')
      .update({ 
        used: true,
        used_at: new Date().toISOString()
      } as any) // Type assertion para evitar erro de tipagem
      .eq('id', verification.id);

    if (updateError) {
      console.error('❌ Erro ao marcar código como usado:', updateError);
      return false;
    }

    console.log('✅ Código marcado como usado com sucesso');

    // 3. Se userId fornecido, atualizar o perfil imediatamente
    if (userId) {
      console.log('💾 Atualizando perfil do usuário com telefone verificado...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          is_verified: true,
          phone: phoneNumber,
          phone_number: phoneNumber // Garantir compatibilidade
        })
        .eq('id', userId);

      if (profileError) {
        console.error('❌ Erro ao atualizar perfil:', profileError);
        return false; // Retornar false pois falhou na atualização
      } else {
        console.log('✅ Perfil atualizado com sucesso - telefone:', phoneNumber);
        return true;
      }
    }

    console.log('✅ Valeração concluída com sucesso');
    return true;
    
  } catch (error) {
    console.error('❌ Erro inesperado no validateAuthCode:', error);
    return false;
  }
}