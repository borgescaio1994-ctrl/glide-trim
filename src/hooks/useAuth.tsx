import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { clearDeferred } from '@/lib/verificationStorage';
import { clearSupabaseAuthStorage, isSessionLikeAuthError } from '@/lib/authStorage';
import { queryKeys } from '@/lib/queryKeys';
import { fetchProfileByUserId } from '@/api/profile';
import type { Profile } from '@/types/auth';

export type { Profile, ProfileRole } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  /** Bootstrap da sessão + carregamento do perfil via React Query */
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

/** Evita getSession + refetch de perfil a cada foco na aba (reduz loops e corrida com refresh). */
const MIN_VISIBILITY_SESSION_SYNC_MS = 180_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  /** false até a primeira resolução de sessão (getSession no bootstrap). */
  const [sessionReady, setSessionReady] = useState(false);

  const lastVisibilitySyncAtRef = useRef(0);

  const profileQuery = useQuery({
    queryKey: queryKeys.profile(user?.id),
    queryFn: () => fetchProfileByUserId(user!.id),
    enabled: !!user?.id && sessionReady,
  });

  const profile = profileQuery.data ?? null;

  /** Sessão inválida / tenant mismatch: limpa só storage Supabase antes de deslogar. */
  const handleSessionCorruption = useCallback(() => {
    clearSupabaseAuthStorage();
    setUser(null);
    queryClient.removeQueries({ queryKey: ['profile'] });
    clearDeferred();
    void supabase.auth.signOut();
  }, [queryClient]);

  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      return queryClient.fetchQuery({
        queryKey: queryKeys.profile(userId),
        queryFn: () => fetchProfileByUserId(userId),
      });
    },
    [queryClient]
  );

  const fetchProfileImmediate = useCallback(
    async (userId: string, phone?: string) => {
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    },
    [queryClient]
  );

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
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    } finally {
      clearSupabaseAuthStorage();
      setUser(null);
      queryClient.removeQueries({ queryKey: ['profile'] });
      clearDeferred();
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) {
          clearSupabaseAuthStorage();
          setUser(null);
          return;
        }
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error('Auth init:', e);
        if (isSessionLikeAuthError(e)) clearSupabaseAuthStorage();
        setUser(null);
      } finally {
        if (mounted) {
          setSessionReady(true);
          lastVisibilitySyncAtRef.current = Date.now();
        }
      }
    };
    void init();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void supabase.auth.startAutoRefresh();
        const now = Date.now();
        if (now - lastVisibilitySyncAtRef.current < MIN_VISIBILITY_SESSION_SYNC_MS) return;
        lastVisibilitySyncAtRef.current = now;
        void supabase.auth.getSession().then(({ data: { session }, error }) => {
          if (!mounted) return;
          if (error && isSessionLikeAuthError(error)) {
            handleSessionCorruption();
            return;
          }
          if (session?.user) {
            setUser(session.user);
            void queryClient.invalidateQueries({ queryKey: queryKeys.profile(session.user.id) });
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        return;
      }
      if (event === 'TOKEN_REFRESHED') {
        return;
      }
      try {
        if (session?.user) {
          setUser(session.user);
          await queryClient.invalidateQueries({ queryKey: queryKeys.profile(session.user.id) });
        } else {
          clearSupabaseAuthStorage();
          setUser(null);
          queryClient.removeQueries({ queryKey: ['profile'] });
        }
      } catch (e) {
        console.error('Auth state change:', e);
        if (isSessionLikeAuthError(e)) clearSupabaseAuthStorage();
        setUser(null);
        queryClient.removeQueries({ queryKey: ['profile'] });
      }
    });
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVisibility);
      subscription.unsubscribe();
    };
  }, [queryClient, handleSessionCorruption]);

  useEffect(() => {
    const onOnline = () => {
      void supabase.auth.refreshSession().then(({ data: { session }, error }) => {
        if (error && import.meta.env.DEV) console.warn('[useAuth] refreshSession após online:', error);
        if (session?.user) {
          setUser(session.user);
          void queryClient.invalidateQueries({ queryKey: queryKeys.profile(session.user.id) });
        }
      });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [queryClient]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key?.startsWith('sb-')) return;
      if (e.newValue != null || e.oldValue == null) return;
      if (!/auth|token/i.test(e.key)) return;
      setUser(null);
      queryClient.removeQueries({ queryKey: ['profile'] });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [queryClient]);

  const loading = !sessionReady || (!!user?.id && profileQuery.isPending);

  const isAdmin =
    !!user &&
    !loading &&
    (profile?.role === 'admin' ||
      profile?.role === 'superadmin' ||
      profile?.profile_role === 'SUPER_ADMIN' ||
      profile?.profile_role === 'ADMIN_BARBER' ||
      (import.meta.env.VITE_ADMIN_EMAIL && user.email === import.meta.env.VITE_ADMIN_EMAIL));

  const isSuperAdmin = !!user && !loading && profile?.profile_role === 'SUPER_ADMIN';

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
