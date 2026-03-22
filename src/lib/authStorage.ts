/**
 * Remove apenas chaves de sessão do Supabase no localStorage (padrão sb-*-auth-token).
 * Evita pedir ao utilizador para limpar o cache do navegador inteiro.
 */
export function clearSupabaseAuthStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith('sb-') && (k.includes('auth') || k.includes('-token'))) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function isSessionLikeAuthError(err: unknown): boolean {
  const msg =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message?: string }).message)
      : String(err ?? '');
  return /session|expired|invalid.*jwt|jwt expired|refresh.*token|not authenticated/i.test(msg);
}
