import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'barber' | 'client';
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: 'barber' | 'client') => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    console.log('fetchProfile called with userId:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('fetchProfile query result - data:', data, 'error:', error);
      if (!error && data) {
        setProfile(data as Profile);
        console.log('Profile set successfully:', data);
      } else {
        console.log('No profile data or error:', error);
      }
    } catch (error) {
      console.error('Exception in fetchProfile:', error);
    }
  };

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!error && !!data);
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    }
  };

  const createProfileForOAuthUser = async (user: User) => {
    try {
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        console.log('Profile already exists for OAuth user');
        return;
      }

      // Create profile for OAuth user
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'Usuário';
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: fullName,
          email: user.email,
          role: 'client', // Default role for OAuth users
          avatar_url: user.user_metadata?.avatar_url || null,
        });

      if (error) {
        console.error('Error creating profile for OAuth user:', error);
      } else {
        console.log('Profile created successfully for OAuth user');
      }
    } catch (error) {
      console.error('Exception creating profile for OAuth user:', error);
    }
  };

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('onAuthStateChange event:', event, 'session:', session ? 'exists' : 'null');
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log('User logged in, checking if profile needs to be created');

        // For OAuth sign-ins, ensure profile exists
        if (event === 'SIGNED_IN' && session.user.app_metadata?.provider === 'google') {
          await createProfileForOAuthUser(session.user);
        }

        console.log('Fetching profile and checking admin role for user:', session.user.id);
        fetchProfile(session.user.id);
        checkAdminRole(session.user.id);
      } else {
        console.log('No user session, clearing profile and admin status');
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // For OAuth sign-ins, ensure profile exists
        if (session.user.app_metadata?.provider === 'google') {
          await createProfileForOAuthUser(session.user);
        }

        fetchProfile(session.user.id);
        checkAdminRole(session.user.id);
      }
      setLoading(false);
    });
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: 'barber' | 'client') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('Tentando fazer login com email:', email);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error('Erro no login:', error);
      } else {
        console.log('Login bem-sucedido');
      }
      return { error };
    } catch (err) {
      console.error('Exceção no signIn:', err);
      return { error: err as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      return { error };
    } catch (err) {
      console.error('Exceção no signInWithGoogle:', err);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, isAdmin, loading, signUp, signIn, signInWithGoogle, signOut }}>
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
