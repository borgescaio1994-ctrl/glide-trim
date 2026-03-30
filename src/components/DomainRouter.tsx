import React, { useEffect } from 'react'

/**
 * Componente que decide qual página renderizar baseado no domínio
 * - synapses-ia.com.br → Redireciona para landing page existente
 * - subdomínios válidos → Página do tenant específico
 */
export default function DomainRouter() {
  const hostname = window.location.hostname
  
  useEffect(() => {
    // Se for domínio principal, redireciona para sua landing page existente
    if (hostname === 'synapses-ia.com.br' || 
        hostname === 'www.synapses-ia.com.br' ||
        hostname === 'localhost:3000' ||
        hostname === 'localhost:5173') {
      window.location.href = 'https://synapse-ia.duckdns.org'
      return
    }
  }, [hostname])
  
  // Enquanto redireciona, mostra loading
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecionando...</p>
      </div>
    </div>
  )
}
