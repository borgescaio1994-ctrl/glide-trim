import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: any | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  fetchProfile: (userId: string) => Promise<any>;
  fetchProfileImmediate: (userId: string, phone?: string) => Promise<any>;
  needsPhoneVerification: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Função para salvar sessão no localStorage
  const saveSessionToStorage = (session: any) => {
    try {
      localStorage.setItem('barberpro_session', JSON.stringify(session));
      localStorage.setItem('barberpro_session_timestamp', Date.now().toString());
    } catch (error) {
      console.error('Erro ao salvar sessão no localStorage:', error);
    }
  };

  // Função para recuperar sessão do localStorage
  const getSessionFromStorage = () => {
    try {
      const session = localStorage.getItem('barberpro_session');
      const timestamp = localStorage.getItem('barberpro_session_timestamp');
      
      if (session && timestamp) {
        const sessionAge = Date.now() - parseInt(timestamp);
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
        
        if (sessionAge < maxAge) {
          return JSON.parse(session);
        } else {
          // Limpar sessão expirada
          localStorage.removeItem('barberpro_session');
          localStorage.removeItem('barberpro_session_timestamp');
        }
      }
    } catch (error) {
      console.error('Erro ao recuperar sessão do localStorage:', error);
    }
    return null;
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle(); // Usando maybeSingle para evitar erros de consulta única

      if (error) throw error;

      if (data) {
        // Sanitização rigorosa para evitar valores null no Guard
        const cleanProfile = {
          ...data,
          is_verified: data.is_verified === true, 
          phone: data.phone || data.phone_number || data.whatsapp_number || "",
        };
        
        setProfile(cleanProfile);
        return cleanProfile;
      }
      return null;
    } catch (error) {
      console.error("❌ Erro ao buscar perfil:", error);
      return null;
    }
  };

  /**
   * Atualiza imediatamente o perfil no Supabase após a verificação de telefone.
   * Regra de ouro: toda verificação bem-sucedida deve passar por aqui.
   */
  const fetchProfileImmediate = async (userId: string, phone?: string) => {
    try {
      const updates: Record<string, any> = {
        is_verified: true,
      };

      if (phone) {
        updates.phone = phone;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select("*")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const cleanProfile = {
          ...data,
          is_verified: data.is_verified === true,
          phone: data.phone || data.phone_number || data.whatsapp_number || "",
        };

        setProfile(cleanProfile);
        return cleanProfile;
      }

      return null;
    } catch (error) {
      console.error("❌ Erro no fetchProfileImmediate:", error);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      
      // Primeiro, tentar recuperar do localStorage
      const cachedSession = getSessionFromStorage();
      if (cachedSession) {
        setUser(cachedSession.user);
        if (cachedSession.user) {
          await fetchProfile(cachedSession.user.id);
        }
      }
      
      // Depois, verificar com Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUser(session.user);
        saveSessionToStorage(session);
        await fetchProfile(session.user.id);
      } else {
        // Se não há sessão no Supabase, limpar cache
        localStorage.removeItem('barberpro_session');
        localStorage.removeItem('barberpro_session_timestamp');
        setUser(null);
        setProfile(null);
      }
      
      setLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.id);
        
        setUser(session?.user ?? null);
        
        if (session) {
          saveSessionToStorage(session);
          await fetchProfile(session.user.id);
        } else {
          // Limpar cache quando deslogar
          localStorage.removeItem('barberpro_session');
          localStorage.removeItem('barberpro_session_timestamp');
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    
    // Limpar cache local
    localStorage.removeItem('barberpro_session');
    localStorage.removeItem('barberpro_session_timestamp');
    
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  // Calcula se o usuário é admin baseado no email ou role
  const isAdmin = user && !loading && (
    user.email === 'admin@barberpro.com' || 
    profile?.role === 'admin' || 
    profile?.role === 'superadmin'
  );

  // Calcula se o usuário precisa verificar telefone
  const needsPhoneVerification = user && !loading && profile && 
    !(profile.is_verified === true);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signOut, 
      signIn,
      signUp,
      fetchProfile,
      fetchProfileImmediate,
      isAdmin, 
      needsPhoneVerification
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
