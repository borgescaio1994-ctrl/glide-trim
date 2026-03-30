import React from 'react'
import SynapseLandingPage from '../pages/SynapseLandingPage'
import TenantPage from '../pages/TenantPage'

/**
 * Componente que decide qual página renderizar baseado no domínio
 * - synapses-ia.com.br → Landing page da Synapse.ia (integrada)
 * - subdomínios válidos → Página do tenant específico
 */
export default function DomainRouter() {
  const hostname = window.location.hostname
  
  // Se for domínio principal, mostra landing page integrada
  if (hostname === 'synapses-ia.com.br' || 
      hostname === 'www.synapses-ia.com.br' ||
      hostname === 'localhost:3000' ||
      hostname === 'localhost:5173') {
    return <SynapseLandingPage />
  }
  
  // Se for subdomínio ou domínio personalizado, mostra página do tenant
  return <TenantPage />
}
