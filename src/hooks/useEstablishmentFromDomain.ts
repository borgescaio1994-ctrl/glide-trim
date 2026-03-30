import { useState, useEffect } from 'react'
import { supabase } from '../integrations/supabase/client'
import type { Establishment } from '../types/establishment'

/**
 * Hook para detectar o estabelecimento atual baseado no domínio/subdomínio
 * Funciona com:
 * - Subdomínios: barbearia.synapses-ia.com.br
 * - Domínios personalizados: barbearia-propria.com.br
 */
export function useEstablishmentFromDomain() {
  const [establishment, setEstablishment] = useState<Establishment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const detectEstablishment = async () => {
      try {
        const hostname = window.location.hostname
        const isCustomDomain = !hostname.endsWith('.synapses-ia.com.br') && hostname !== 'synapses-ia.com.br'
        
        let identifier: string | null = null

        if (isCustomDomain) {
          // Domínio personalizado: busca pelo custom_domain
          identifier = hostname
        } else {
          // Subdomínio: extrai o slug do subdomínio
          const parts = hostname.split('.')
          if (parts.length > 2) {
            const subdomain = parts[0]
            if (subdomain && subdomain !== 'www') {
              identifier = subdomain
            }
          }
        }

        if (!identifier) {
          setLoading(false)
          return
        }

        // Busca o estabelecimento usando SQL direto para evitar problemas de tipo
        const { data, error } = await supabase
          .from('establishments' as any)
          .select('*')
          .eq('status', true)
          .eq(isCustomDomain ? 'custom_domain' : 'slug', identifier)
          .single()

        if (error) {
          // Se não encontrar, redireciona para 404
          if (error.code === 'PGRST116') {
            window.location.href = '/404'
            return
          }
          setError('Erro ao carregar estabelecimento')
          console.error('Error fetching establishment:', error)
          setLoading(false)
          return
        }

        if (!data) {
          // Se não encontrar, redireciona para 404
          window.location.href = '/404'
          return
        }

        setEstablishment(data as Establishment)
        setLoading(false)
      } catch (err) {
        setError('Erro ao carregar estabelecimento')
        console.error('Unexpected error:', err)
        setLoading(false)
      }
    }

    detectEstablishment()
  }, [])

  return {
    establishment,
    loading,
    error,
    isCustomDomain: !window.location.hostname.endsWith('.synapses-ia.com.br') && window.location.hostname !== 'synapses-ia.com.br'
  }
}
