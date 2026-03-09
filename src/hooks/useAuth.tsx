import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'barber' | 'client';
  is_verified: boolean;
  phone_number: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<any>;
  fetchProfile: (userId: string) => Promise<Profile | null>;
  fetchProfileImmediate: (userId: string, phone: string) => Promise<Profile | null>;
  isAdmin: boolean;
  needsPhoneVerification: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        const cleanProfile: Profile = {
          id: data.id,
          email: data.email,
          full_name: data.full_name || '',
          role: data.role || 'client',
          is_verified: data.is_verified === true || String(data.is_verified) === 'true',
          phone_number: data.phone_number || '',
        };
        setProfile(cleanProfile);
        return cleanProfile;
      }
      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar perfil:', error);
      return null;
    }
  }, []);

  const fetchProfileImmediate = async (userId: string, phone: string): Promise<Profile | null> => {
    setIsSyncing(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_verified: true, phone_number: phone })
        .eq('id', userId);

      if (updateError) throw updateError;

      const { data: freshData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (freshData) {
        const finalProfile = {
          ...freshData,
          is_verified: true,
          phone_number: phone
        };
        setProfile(finalProfile);
        // Pequeno delay para garantir que o estado do React estabilize antes de liberar o 'needsPhoneVerification'
        setTimeout(() => setIsSyncing(false), 800);
        return finalProfile;
      }
      return null;
    } catch (error) {
      console.error('❌ Erro na sincronização imediata:', error);
      setIsSyncing(false);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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

  const needsPhoneVerification = 
    !loading && 
    !isSyncing && 
    !!user && 
    profile?.role === 'client' && 
    profile?.is_verified === false;

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading: (loading || isSyncing), 
      signOut: async () => { await supabase.auth.signOut(); }, 
      signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signUp: (email, password, name, phone) => supabase.auth.signUp({ 
        email, password, options: { data: { full_name: name, phone_number: phone } } 
      }),
      fetchProfile, 
      fetchProfileImmediate, 
      isAdmin: profile?.role === 'admin', 
      needsPhoneVerification 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};