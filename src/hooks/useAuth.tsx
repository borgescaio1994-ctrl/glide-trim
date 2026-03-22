import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { clearDeferred } from '@/lib/verificationStorage';

export type ProfileRole = 'SUPER_ADMIN' | 'ADMIN_BARBER' | 'BARBER' | 'CUSTOMER';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'client' | 'barber' | 'admin';
  profile_role?: ProfileRole;
  establishment_id: string | null;
  is_verified: boolean;
  phone: string;
  /** URL pública do avatar (precisa estar no contexto para o /profile exibir após reload) */
  avatar_url?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  phone_verified?: boolean | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    phone?: string,
    establishmentId?: string | null
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<Profile | null>;
  fetchProfileImmediate: (userId: string, phone?: string) => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  needsPhoneVerification: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Limite para não travar a UI se o PostgREST não responder (rede lenta / aba em background). */
const PROFILE_FETCH_TIMEOUT_MS = Number(import.meta.env.VITE_PROFILE_FETCH_TIMEOUT_MS ?? 120000);

const TIMEOUT_LOG_COOLDOWN_MS = 120_000;

function mapRowToProfile(data: Record<string, unknown>): Profile {
  return {
    id: data.id as string,
    email: data.email as string,
    full_name: (data.full_name as string) || '',
    role: (data.role as Profile['role']) || 'client',
    profile_role: (data.profile_role as ProfileRole) || 'CUSTOMER',
    establishment_id: (data.establishment_id as string | null) ?? null,
    is_verified: !!data.is_verified,
    phone: (data.phone as string) || (data.phone_number as string) || '',
    avatar_url: (data.avatar_url as string | null | undefined) ?? null,
    phone_number: (data.phone_number as string | null | undefined) ?? null,
    whatsapp_number: (data.whatsapp_number as string | null | undefined) ?? null,
    phone_verified: (data.phone_verified as boolean | null | undefined) ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  /** Evita N requests paralelos para o mesmo usuário (recover/refresh + listeners). */
  const profileInflightRef = useRef<Map<string, Promise<Profile | null>>>(new Map());
  const lastTimeoutLogAtRef = useRef(0);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const existing = profileInflightRef.current.get(userId);
    if (existing) return existing;

    const run = (async (): Promise<Profile | null> => {
      const queryPromise = supabase.from('profiles').select('*').eq('id', userId).single();
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), PROFILE_FETCH_TIMEOUT_MS)
      );
      try {
        const raced = await Promise.race([queryPromise, timeoutPromise]);
        if (raced === null) {
          const now = Date.now();
          if (now - lastTimeoutLogAtRef.current > TIMEOUT_LOG_COOLDOWN_MS) {
            lastTimeoutLogAtRef.current = now;
            console.warn(
              '[useAuth] fetchProfile: timeout após',
              PROFILE_FETCH_TIMEOUT_MS,
              'ms (rede lenta ou API indisponível). Próximo aviso em ~2 min.'
            );
          }
          return null;
        }
        const { data, error } = raced as Awaited<typeof queryPromise>;
        if (error || !data) {
          setProfile(null);
          return null;
        }
        const row = data as Record<string, unknown>;
        const cleanProfile = mapRowToProfile(row);
        setProfile(cleanProfile);
        return cleanProfile;
      } catch {
        setProfile(null);
        return null;
      } finally {
        profileInflightRef.current.delete(userId);
      }
    })();

    profileInflightRef.current.set(userId, run);
    return run;
  }, []);

  /** Só no primeiro load: poucas tentativas (trigger handle_new_user pode atrasar). */
  const fetchProfileWithRetries = useCallback(
    async (userId: string): Promise<Profile | null> => {
      const delays = [0, 500, 1500];
      for (const ms of delays) {
        if (ms > 0) await new Promise((r) => setTimeout(r, ms));
        const p = await fetchProfile(userId);
        if (p) return p;
      }
      return null;
    },
    [fetchProfile]
  );

  const fetchProfileImmediate = useCallback(async (userId: string, phone?: string) => {
    const updates: Record<string, unknown> = { is_verified: true };
    if (phone) {
      updates.phone = phone;
      updates.phone_number = phone;
    }
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('id')
      .maybeSingle();
    if (error && import.meta.env.DEV) console.warn('fetchProfileImmediate:', error);
    await fetchProfile(userId);
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ?? null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    phone?: string,
    establishmentId?: string | null
  ) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: 'client',
            ...(phone && { phone }),
            ...(establishmentId && { establishment_id: establishmentId }),
          },
        },
      });
      return { error: error ?? null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    clearDeferred();
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const loadedProfile = await fetchProfileWithRetries(session.user.id);
          if (!loadedProfile && mounted) {
            console.warn('[useAuth] init: perfil não carregado após retries; sessão mantida');
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (e) {
        console.error('Auth init:', e);
        setUser(null);
        setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void init();

    // Volta à aba: reativa refresh do JWT e re-sincroniza perfil (evita “travado” após background).
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void supabase.auth.startAutoRefresh();
        void supabase.auth.getSession().then(({ data: { session } }) => {
          if (!mounted) return;
          if (session?.user) {
            setUser(session.user);
            void fetchProfile(session.user.id);
          }
        });
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    if (document.visibilityState === 'visible') {
      void supabase.auth.startAutoRefresh();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        // init() já tratou getSession — evita loading duplicado e fetch em paralelo
        return;
      }
      // Refresh do JWT não altera dados do perfil; refetch aqui dispara loop com _recoverAndRefresh + timeout
      if (event === 'TOKEN_REFRESHED') {
        return;
      }
      try {
        if (session?.user) {
          setUser(session.user);
          setLoading(true);
          // Um único fetch — retries pesados só no init()
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (e) {
        console.error('Auth state change:', e);
        setUser(null);
        setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    });
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVisibility);
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchProfileWithRetries]);

  const isAdmin =
    !!user &&
    !loading &&
    (profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.profile_role === 'SUPER_ADMIN' || profile?.profile_role === 'ADMIN_BARBER' || (import.meta.env.VITE_ADMIN_EMAIL && user.email === import.meta.env.VITE_ADMIN_EMAIL));

  const isSuperAdmin = !!user && !loading && profile?.profile_role === 'SUPER_ADMIN';

  // SUPER_ADMIN não passa por verificação de telefone/OTP
  const needsPhoneVerification =
    !!user &&
    !loading &&
    !!profile &&
    profile.profile_role !== 'SUPER_ADMIN' &&
    !(profile.is_verified === true);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        fetchProfile,
        fetchProfileImmediate,
        isAdmin,
        isSuperAdmin,
        needsPhoneVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
