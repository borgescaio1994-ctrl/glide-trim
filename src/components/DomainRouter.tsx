import React from 'react'
import SynapsesLanding from '../pages/SynapsesLanding'
import TenantPage from '../pages/TenantPage'

/**
 * Componente que decide qual página renderizar baseado no domínio
 * - synapses-ia.com.br → Landing page da Synapses IA
 * - subdomínios válidos → Página do tenant específico
 */
export default function DomainRouter() {
  const hostname = window.location.hostname
  
  // Se for domínio principal, mostra landing page
  if (hostname === 'synapses-ia.com.br' || 
      hostname === 'www.synapses-ia.com.br' ||
      hostname === 'localhost:3000' ||
      hostname === 'localhost:5173') {
    return <SynapsesLanding />
  }
  
  // Se for subdomínio ou domínio personalizado, mostra página do tenant
  return <TenantPage />
}
