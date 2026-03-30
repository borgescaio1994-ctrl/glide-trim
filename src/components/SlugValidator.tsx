import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../integrations/supabase/client'
import { Loader2 } from 'lucide-react'

interface SlugValidatorProps {
  children: React.ReactNode
}

/**
 * Componente que valida se o slug existe antes de renderizar a rota
 * Se o slug não existir, redireciona para 404 ou página principal
 */
export default function SlugValidator({ children }: SlugValidatorProps) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [isValid, setIsValid] = useState<boolean | null>(null)

  useEffect(() => {
    if (!slug) {
      navigate('/404', { replace: true })
      return
    }

    validateSlug()
  }, [slug, navigate])

  const validateSlug = async () => {
    try {
      // Verificar se o slug existe e está ativo
      const { data, error } = await (supabase as any)
        .from('establishments')
        .select('id')
        .eq('slug', slug)
        .eq('status', true)
        .single()

      if (error || !data) {
        // Slug não existe ou está inativo - redirecionar para 404
        navigate('/404', { replace: true })
        return
      }

      // Slug válido
      setIsValid(true)
    } catch (err) {
      console.error('Error validating slug:', err)
      navigate('/404', { replace: true })
    }
  }

  // Enquanto valida, mostra loading
  if (isValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Verificando barbearia...</p>
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
