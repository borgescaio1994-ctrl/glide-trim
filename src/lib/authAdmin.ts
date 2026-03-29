import { createClient } from '@supabase/supabase-js'
import type { Database } from '../integrations/supabase/types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? ''

// Cliente admin com service role key para operações administrativas
// Só cria se a SERVICE_ROLE_KEY estiver disponível
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY ? createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
) : null

/**
 * Deleta um usuário do Supabase Auth pelo email
 * Usado quando um perfil é deletado para liberar o email
 */
export async function deleteUserFromAuth(email: string): Promise<{ error: string | null }> {
  // Se não tiver SERVICE_ROLE_KEY, não faz nada - mantém comportamento original
  if (!supabaseAdmin) {
    console.warn('SERVICE_ROLE_KEY not available - skipping auth user deletion')
    return { error: null }
  }

  try {
    // Primeiro, busca o usuário pelo email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return { error: 'Erro ao listar usuários' }
    }

    // Encontra o usuário pelo email
    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      console.warn('User not found for email:', email)
      return { error: null } // Usuário não encontrado, não é um erro
    }

    // Deleta o usuário do Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    
    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError)
      return { error: 'Erro ao deletar usuário do Auth' }
    }

    console.log('User deleted from auth successfully:', email)
    return { error: null }
  } catch (error) {
    console.error('Unexpected error deleting user from auth:', error)
    return { error: 'Erro inesperado ao deletar usuário do Auth' }
  }
}

/**
 * Deleta múltiplos usuários do Supabase Auth pelos emails
 */
export async function deleteUsersFromAuth(emails: string[]): Promise<{ errors: string[] }> {
  const errors: string[] = []
  
  for (const email of emails) {
    const result = await deleteUserFromAuth(email)
    if (result.error) {
      errors.push(`${email}: ${result.error}`)
    }
  }
  
  return { errors }
}
