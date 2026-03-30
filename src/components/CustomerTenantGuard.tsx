import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useEstablishmentFromDomain } from '@/hooks/useEstablishmentFromDomain'

/**
 * Guard para gerenciar acesso de clientes a diferentes barbearias
 * Funciona com subdomínios e domínios personalizados
 */
export default function CustomerTenantGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { establishment, loading, error } = useEstablishmentFromDomain()

  useEffect(() => {
    // Se ainda está carregando, não faz nada
    if (loading) {
      return
    }

    // Se houver erro, não faz nada
    if (error) {
      return
    }

    // Se não há estabelecimento, não faz nada
    if (!establishment) {
      return
    }

    // Se o usuário não está logado, permite acessar qualquer página
    if (!profile) {
      return
    }

    // Se o usuário já tem um establishment_id vinculado, não redireciona
    if (profile.establishment_id) {
      return
    }

    // Se o usuário é cliente e não tem establishment vinculado,
    // redireciona para a página do tenant atual
    if (profile.profile_role === 'CLIENT' && !profile.establishment_id) {
      navigate('/tenant', { replace: true })
    }
  }, [establishment, loading, error, profile, navigate])

  return <>{children}</>
}
