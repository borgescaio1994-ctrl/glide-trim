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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  fetchProfile: (userId: string) => Promise<Profile | null>;
  fetchProfileImmediate: (userId: string, phoneNumber: string) => Promise<void>; // Função crucial adicionada
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Busca o perfil de forma estável
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      console.log('🔍 Buscando perfil para:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar perfil:', error);
        return null;
      }

      if (data) {
        const cleanProfile: Profile = {
          id: data.id,
          email: data.email,
          full_name: data.full_name || '',
          role: data.role || 'client',
          is_verified: !!data.is_verified, // Força booleano real
          phone: data.phone || data.phone_number || '' // Tenta as duas colunas comuns
        };
        
        setProfile(cleanProfile);
        return cleanProfile;
      }
      return null;
    } catch (error) {
      console.error('❌ Erro inesperado no fetchProfile:', error);
      return null;
    }
  }, []);

  // ESTA FUNÇÃO É A QUE ESTAVA FALTANDO PARA SALVAR O NÚMERO
  const fetchProfileImmediate = async (userId: string, phoneNumber: string) => {
    console.log('💾 Gravando verificação e telefone no banco para:', userId);
    try {
      // 1. Atualiza no Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          is_verified: true, 
          phone: phoneNumber // Se der erro aqui, mude para 'phone_number' conforme seu banco
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 2. Força a atualização do estado local buscando os dados novos
      const updated = await fetchProfile(userId);
      
      if (updated) {
        console.log('✅ Banco e Estado Local sincronizados com sucesso!');
      }
    } catch (error) {
      console.error('❌ Erro fatal na gravação do perfil:', error);
      throw error; // Repassa o erro para o componente tratar
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      setUser(data.user);
      await fetchProfile(data.user.id);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    if (data.user) {
      setUser(data.user);
      await fetchProfile(data.user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) throw error;
    if (profile) setProfile({ ...profile, ...updates });
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

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        fetchProfile,
        fetchProfileImmediate, // Disponibilizando para as páginas
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