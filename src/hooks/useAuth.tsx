import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'client' | 'barber' | 'admin';
  is_verified: boolean;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<Profile | null>;
  fetchProfileImmediate: (userId: string, phone?: string) => Promise<void>;
  isAdmin: boolean;
  needsPhoneVerification: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) return null;
      if (!data) return null;

      const cleanProfile: Profile = {
        id: data.id,
        email: data.email,
        full_name: data.full_name || '',
        role: data.role || 'client',
        is_verified: !!data.is_verified,
        phone: data.phone || data.phone_number || '',
      };
      setProfile(cleanProfile);
      return cleanProfile;
    } catch {
      return null;
    }
  }, []);

  const fetchProfileImmediate = useCallback(async (userId: string, phone?: string) => {
    const updates: Record<string, unknown> = { is_verified: true };
    if (phone) {
      updates.phone = phone;
      updates.phone_number = phone;
      updates.whatsapp_number = phone;
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (!error) await fetchProfile(userId);
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ?? null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
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
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const loadedProfile = await fetchProfile(session.user.id);
        if (!loadedProfile) {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const isAdmin =
    !!user &&
    !loading &&
    (profile?.role === 'admin' || profile?.role === 'superadmin' || (import.meta.env.VITE_ADMIN_EMAIL && user.email === import.meta.env.VITE_ADMIN_EMAIL));

  const needsPhoneVerification =
    !!user && !loading && !!profile && !(profile.is_verified === true);

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
