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
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ error: Error | null }>;
  fetchProfile: (userId: string) => Promise<any>;
  fetchProfileImmediate: (userId: string, partialUpdate?: any) => Promise<any>;
  setIsAdmin: (value: boolean) => void;
  needsPhoneVerification: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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
        const maxAge = 7 * 24 * 60 * 60 * 1000; //7 dias
        
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

  // Adicionar debounce para evitar múltiplas chamadas
  const fetchProfileWithDebounce = (() => {
    let isFetching = false;
    let lastFetchTime = 0;
    
    return async (userId: string) => {
      const now = Date.now();
      
      // Evitar múltiplas chamadas em menos de 2 segundos
      if (isFetching || (now - lastFetchTime) < 2000) {
        return null;
      }
      
      isFetching = true;
      lastFetchTime = now;
      
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
      } finally {
        isFetching = false;
      }
    };
  })();

  // Alias para manter compatibilidade
  const fetchProfile = fetchProfileWithDebounce;

  // Função para atualizar perfil imediatamente (sem debounce)
  const fetchProfileImmediate = async (userId: string, partialUpdate?: Partial<any>) => {
    try {
      if (partialUpdate) {
        // Se houver atualização parcial, buscar perfil atual direto do banco (sem debounce)
        const { data: currentProfileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();
        
        if (currentProfileData) {
          const mergedProfile = {
            ...currentProfileData,
            ...partialUpdate,
            // Garante que campos importantes não sejam sobrescritos com null
            is_verified: partialUpdate.is_verified !== undefined ? partialUpdate.is_verified : currentProfileData.is_verified,
            phone: partialUpdate.phone || currentProfileData.phone,
            phone_number: partialUpdate.phone_number || currentProfileData.phone_number,
            whatsapp_number: partialUpdate.whatsapp_number || currentProfileData.whatsapp_number,
          };
          
          setProfile(mergedProfile);
          return mergedProfile;
        }
      }
      
      // Se não houver atualização parcial, buscar perfil direto do banco
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

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
      console.error("❌ Erro ao buscar perfil imediatamente:", error);
      return null;
    }
  };

  // Atualizar isAdmin baseado na role do perfil
  useEffect(() => {
    if (profile) {
      const isAdminRole = profile.role === 'admin' || profile.is_admin === true;
      setIsAdmin(isAdminRole);
    }
  }, [profile]);

  // Monitorar mudanças no perfil para parar loop de verificação
  useEffect(() => {
    if (profile && profile.is_verified === true) {
      // O perfil já está verificado, não precisa continuar verificando
    }
  }, [profile?.is_verified]);

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      
      // Primeiro, tentar recuperar do localStorage
      const cachedSession = getSessionFromStorage();
      if (cachedSession) {
        setUser(cachedSession.user);
        if (cachedSession.user) {
          await fetchProfileWithDebounce(cachedSession.user.id);
        }
      }
      
      // Depois, verificar com Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUser(session.user);
        saveSessionToStorage(session);
        await fetchProfileWithDebounce(session.user.id);
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
        // Apenas atualizar usuário se realmente mudar
        if (JSON.stringify(session?.user) !== JSON.stringify(user)) {
          setUser(session?.user ?? null);
          
          if (session) {
            saveSessionToStorage(session);
            await fetchProfileWithDebounce(session.user.id);
          } else {
            // Limpar cache quando deslogar
            localStorage.removeItem('barberpro_session');
            localStorage.removeItem('barberpro_session_timestamp');
            setProfile(null);
          }
          
          setLoading(false);
        }
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

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone,
            phone_number: phone,
            whatsapp_number: phone,
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

  // Calcula se o usuário precisa verificar telefone (apenas clientes)
  const needsPhoneVerification = user && !loading && profile && 
    profile.role === 'client' && !(profile.is_verified === true);

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
      setIsAdmin, 
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
