import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'barber' | 'client';
  is_verified: boolean;
  phone: string;
}

interface AuthContextType {
  user: any;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<any>;
  fetchProfile: (userId: string) => Promise<Profile | null>;
  fetchProfileImmediate: (userId: string) => Promise<Profile | null>;
  isAdmin: boolean;
  needsPhoneVerification: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('🔍 fetchProfile chamado para userId:', userId);
      console.log('  - Perfil atual:', profile);
      
      // Adicionar debounce para evitar chamadas excessivas
      const now = Date.now();
      const lastCall = (fetchProfile as any)._lastCall || 0;
      const timeSinceLastCall = now - lastCall;
      
      if (timeSinceLastCall < 1000) {
        console.log('🔍 fetchProfile chamado muito recentemente, ignorando');
        return profile;
      }
      
      (fetchProfile as any)._lastCall = now;
      
      // Se o perfil já foi atualizado recentemente (últimos 5 segundos), não buscar do banco
      const lastUpdate = (profile as any)?._lastUpdated || 0;
      const timeSinceUpdate = now - lastUpdate;
      
      if (timeSinceUpdate < 5000 && profile?.is_verified === true) {
        console.log('🔍 Perfil atualizado recentemente, pulando busca do banco');
        return profile;
      }
      
      console.log('🔍 Buscando perfil do banco...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.log('❌ Erro ou timeout na busca do perfil, usando estado atual');
        return profile; // Retorna o perfil atual mesmo com erro
      }

      if (data) {
        const cleanProfile = {
          ...data,
          is_verified: data.is_verified === true, 
          phone: data.phone || data.phone_number || data.whatsapp_number || "",
        };
        
        console.log('🔍 Perfil buscado com sucesso:', cleanProfile);
        setProfile(cleanProfile);
        return cleanProfile;
      }
      return profile;
    } catch (error) {
      console.error('❌ Erro ao buscar perfil:', error);
      return profile;
    }
  };

  const fetchProfileImmediate = async (userId: string, partialUpdate?: Partial<any>) => {
    try {
      if (partialUpdate) {
        console.log('🔍 fetchProfileImmediate com atualização local + banco');
        
        // Primeiro, atualiza o estado local imediatamente
        const currentProfile = profile || {
          id: userId,
          email: '',
          full_name: '',
          role: 'client',
          is_verified: false,
          phone: '',
          phone_number: '',
          whatsapp_number: ''
        };
        
        const mergedProfile = {
          ...currentProfile,
          ...partialUpdate,
          // Garante que campos importantes não sejam sobrescritos com null
          is_verified: partialUpdate.is_verified !== undefined ? partialUpdate.is_verified : currentProfile.is_verified,
          phone: partialUpdate.phone || currentProfile.phone,
          phone_number: partialUpdate.phone_number || currentProfile.phone_number,
          whatsapp_number: partialUpdate.whatsapp_number || currentProfile.whatsapp_number,
        };
        
        console.log('🔍 Atualizando perfil local:');
        console.log('  - currentProfile:', currentProfile);
        console.log('  - partialUpdate:', partialUpdate);
        console.log('  - mergedProfile:', mergedProfile);
        console.log('  - mergedProfile.phone:', mergedProfile.phone);
        console.log('  - mergedProfile.is_verified:', mergedProfile.is_verified);
        
        setProfile(mergedProfile);
        
        // Depois, tenta salvar no banco (com timeout)
        try {
          console.log('🔍 Salvando atualização no banco...');
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout ao salvar no banco')), 3000);
          });
          
          const updatePromise = supabase
            .from("profiles")
            .update(partialUpdate)
            .eq("id", userId);

          const { error } = await Promise.race([updatePromise, timeoutPromise]) as any;
          
          if (error) {
            console.log('❌ Erro ou timeout ao salvar no banco, mas estado local foi atualizado');
            console.log('  - Erro:', error);
          } else {
            console.log('✅ Salvo no banco com sucesso');
          }
        } catch (error) {
          console.log('❌ Erro ao salvar no banco, mas estado local foi atualizado');
          console.log('  - Erro:', error);
        }
        
        return mergedProfile;
      }
      
      // Se não houver atualização parcial, busca perfil do banco (com timeout)
      console.log('🔍 Buscando perfil do banco...');
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na busca do perfil')), 3000);
      });
      
      const queryPromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        console.log('❌ Erro ou timeout na busca do perfil, usando estado atual');
        return profile; // Retorna o perfil atual mesmo com erro
      }

      if (data) {
        // Sanitização rigorosa para evitar valores null no Guard
        const cleanProfile = {
          ...data,
          is_verified: data.is_verified === true, 
          phone: data.phone || data.phone_number || data.whatsapp_number || "",
        };
        
        console.log('🔍 Perfil buscado com sucesso:', cleanProfile);
        setProfile(cleanProfile);
        return cleanProfile;
      }
      return profile;
    } catch (error) {
      console.error("❌ Erro ao buscar perfil imediatamente:", error);
      return profile; // Retorna o perfil atual mesmo com erro
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
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Define se precisa de verificação: Se for cliente e NÃO estiver verificado
  const needsPhoneVerification = !!user && !loading && !!profile && 
    profile.role === 'client' && 
    profile.is_verified === false; // Checa apenas is_verified

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signOut: async () => { await supabase.auth.signOut(); }, 
      signIn: async (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signUp: async (email, password, name, phone) => supabase.auth.signUp({ email, password, options: { data: { full_name: name, phone } } }),
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
}