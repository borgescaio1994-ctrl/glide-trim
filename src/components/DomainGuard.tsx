import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../integrations/supabase/client'
import { Loader2 } from 'lucide-react'

interface DomainGuardProps {
  children: React.ReactNode
}

/**
 * Guard que valida o domínio/subdomínio no nível mais alto da aplicação
 * Se o subdomínio não existir no banco, redireciona para 404 imediatamente
 */
export default function DomainGuard({ children }: DomainGuardProps) {
  const navigate = useNavigate()
  const [isValid, setIsValid] = useState<boolean | null>(null)

  useEffect(() => {
    validateDomain()
  }, [])

  const validateDomain = async () => {
    try {
      const hostname = window.location.hostname
      
      // Se for domínio principal ou localhost, permite
      if (hostname === 'synapses-ia.com.br' || 
          hostname === 'www.synapses-ia.com.br' ||
          hostname === 'localhost:3000' ||
          hostname === 'localhost:5173') {
        setIsValid(true)
        return
      }

      // Se for domínio personalizado, verifica se existe
      const isCustomDomain = !hostname.endsWith('.synapses-ia.com.br')
      
      if (isCustomDomain) {
        const { data, error } = await (supabase as any)
          .from('establishments')
          .select('id')
          .eq('custom_domain', hostname)
          .eq('status', true)
          .single()

        if (error || !data) {
          // Domínio personalizado não existe
          window.location.href = 'https://synapses-ia.com.br/404'
          return
        }
        
        setIsValid(true)
        return
      }

      // Se for subdomínio, verifica se existe
      const parts = hostname.split('.')
      if (parts.length > 2) {
        const subdomain = parts[0]
        
        if (subdomain === 'www') {
          setIsValid(true)
          return
        }

        const { data, error } = await (supabase as any)
          .from('establishments')
          .select('id')
          .eq('slug', subdomain)
          .eq('status', true)
          .single()

        if (error || !data) {
          // Subdomínio não existe - redireciona para 404
          window.location.href = 'https://synapses-ia.com.br/404'
          return
        }
        
        setIsValid(true)
        return
      }

      // Domínio inválido
      window.location.href = 'https://synapses-ia.com.br/404'
      
    } catch (err) {
      console.error('Error validating domain:', err)
      window.location.href = 'https://synapses-ia.com.br/404'
    }
  }

  // Enquanto valida, mostra loading
  if (isValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Verificando domínio...</p>
        </div>
      </div>
    )
  }

  // Se for válido, renderiza os children
  if (isValid) {
    return <>{children}</>
  }

  // Se não for válido, não renderiza nada (já redirecionou)
  return null
}
