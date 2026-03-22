/**
 * Storage do fluxo de verificação – evita loop após sucesso.
 * O Guard NUNCA redireciona de /profile ou /appointments para /verify-phone.
 */

const KEY_JUST_VERIFIED = 'phone_just_verified';
const KEY_DEFERRED = 'phone_verify_deferred';
const TTL_MS = 60_000;

export function setJustVerified(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(KEY_JUST_VERIFIED, Date.now().toString());
  } catch {
    // ignore
  }
}

export function isJustVerified(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.sessionStorage.getItem(KEY_JUST_VERIFIED);
    if (!raw) return false;
    const t = parseInt(raw, 10);
    if (Number.isNaN(t)) return false;
    if (Date.now() - t > TTL_MS) {
      window.sessionStorage.removeItem(KEY_JUST_VERIFIED);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function isDeferred(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KEY_DEFERRED) === 'true';
  } catch {
    return false;
  }
}

export function setDeferred(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY_DEFERRED, 'true');
  } catch {
    // ignore
  }
}

export function clearDeferred(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY_DEFERRED);
  } catch {
    // ignore
  }
}
