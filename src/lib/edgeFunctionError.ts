/**
 * Supabase `functions.invoke` devolve mensagem genérica em `error.message` quando o status não é 2xx.
 * O corpo JSON da Edge Function fica em `error.context` (Response) — precisa de `.json()`.
 */
export function humanizeEdgeFunctionError(message: string): string {
  const m = message.trim();
  if (!m) return 'Erro desconhecido na operação.';
  if (/already been registered|already registered|User already registered|duplicate key|unique constraint/i.test(m)) {
    return 'Este e-mail já está cadastrado no Auth. Use outro e-mail ou remova o usuário em Supabase → Authentication → Users.';
  }
  if (/invalid email|email.*invalid/i.test(m)) {
    return 'E-mail inválido. Verifique o formato.';
  }
  if (/password|Password|senha/i.test(m) && /length|at least|characters|mínimo|muito curta/i.test(m)) {
    return `${m} (O Supabase costuma exigir senha com pelo menos 6 caracteres.)`;
  }
  return m;
}

function parseErrorFieldFromJson(json: unknown): string | null {
  if (json && typeof json === 'object' && json !== null) {
    const err = (json as { error?: unknown }).error;
    if (typeof err === 'string' && err.trim()) return err.trim();
  }
  return null;
}

async function tryReadErrorFromResponseContext(error: Error | null): Promise<string | null> {
  if (!error || typeof error !== 'object' || !('context' in error)) return null;
  const ctx = (error as { context?: unknown }).context;
  if (!ctx) return null;

  // Versões recentes: context é o Response
  if (typeof (ctx as Response).json === 'function') {
    try {
      const json = await (ctx as Response).clone().json();
      return parseErrorFieldFromJson(json);
    } catch {
      /* ignore */
    }
  }

  // Algumas builds: { response: Response }
  const nested = (ctx as { response?: unknown }).response;
  if (nested && typeof (nested as Response).json === 'function') {
    try {
      const json = await (nested as Response).clone().json();
      return parseErrorFieldFromJson(json);
    } catch {
      /* ignore */
    }
  }

  const body = (ctx as { body?: unknown }).body;
  if (typeof body === 'string' && body.trim()) {
    try {
      return parseErrorFieldFromJson(JSON.parse(body));
    } catch {
      /* ignore */
    }
  }

  return null;
}

/** Extrai a mensagem útil de `invoke({ data, error })`. */
export async function messageFromFunctionsInvoke(data: unknown, error: Error | null): Promise<string> {
  if (data && typeof data === 'object' && data !== null && 'error' in data) {
    const e = (data as { error?: unknown }).error;
    if (typeof e === 'string' && e.trim()) return humanizeEdgeFunctionError(e);
  }
  const fromContext = await tryReadErrorFromResponseContext(error);
  if (fromContext) return humanizeEdgeFunctionError(fromContext);
  return humanizeEdgeFunctionError(error?.message ?? 'Erro ao chamar a função.');
}
