/**
 * Domínio principal da agência (landing), sem tenant no hostname.
 */
export function isSynapseAgencyMainDomain(hostnameInput: string): boolean {
  const hostname = hostnameInput.toLowerCase().trim();
  return hostname === 'synapses-ia.com.br' || hostname === 'www.synapses-ia.com.br';
}

/**
 * Slug da loja a partir do hostname (subdomínio *.synapses-ia.com.br).
 * O domínio principal synapses-ia.com.br não tem slug de tenant no host.
 */
export function getTenantSlugFromSynapseHostname(hostnameInput: string): string | null {
  const hostname = hostnameInput.toLowerCase().trim();
  if (!hostname) return null;

  if (isSynapseAgencyMainDomain(hostname)) {
    return null;
  }

  if (!hostname.endsWith('.synapses-ia.com.br')) {
    return null;
  }

  const parts = hostname.split('.');
  const sub = parts[0];
  if (!sub || sub === 'www' || sub === 'app') return null;
  if (!/^[a-z0-9-]+$/.test(sub)) return null;
  return sub;
}

function isLocalOrIpHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1') return true;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(h);
}

/**
 * Domínio próprio (não synapses-ia), excluindo localhost/IP para dev.
 */
export function isCustomDomainHostname(hostnameInput: string): boolean {
  const hostname = hostnameInput.toLowerCase();
  if (isLocalOrIpHostname(hostname)) return false;
  return !isSynapseAgencyMainDomain(hostname) && !hostname.endsWith('.synapses-ia.com.br');
}
