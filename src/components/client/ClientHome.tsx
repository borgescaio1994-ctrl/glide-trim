import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEstablishment } from '@/hooks/useEstablishment';
import { Search, Scissors, LogIn } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
interface Barber {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface HomeSettings {
  hero_image_url: string | null;
  title: string;
  subtitle: string | null;
}

export default function ClientHome() {
  const { user, profile } = useAuth();
  const { establishmentId, loading: establishmentLoading } = useEstablishment();
  const navigate = useNavigate();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [homeSettings, setHomeSettings] = useState<HomeSettings | null>(null);

  useEffect(() => {
    if (establishmentLoading) return;
    void fetchData();
  }, [establishmentId, establishmentLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const superadminEmail = import.meta.env.VITE_SUPERADMIN_EMAIL || '';

      // Aguarda resolução da unidade; sem ID (ex.: IP sem slug) mostra estado vazio, não loop
      if (!establishmentId) {
        setHomeSettings(null);
        setBarbers([]);
        return;
      }

      if (establishmentId) {
        const { data: estData } = await supabase
          .from('establishments')
          .select('name, hero_image_url, home_title, home_subtitle')
          .eq('id', establishmentId)
          .maybeSingle();

        if (estData) {
          setHomeSettings({
            hero_image_url: (estData as any).hero_image_url ?? null,
            title: ((estData as any).home_title ?? estData.name ?? 'BookNow') as string,
            subtitle: ((estData as any).home_subtitle ?? null) as string | null,
          });
        } else {
          setHomeSettings(null);
        }
      } else {
        setHomeSettings(null);
      }

      let query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('profile_role', ['BARBER', 'ADMIN_BARBER'] as any);
      if (superadminEmail) query = query.neq('email', superadminEmail);
      query = query.eq('establishment_id', establishmentId);
      const { data: barbersData, error: queryErr } = await query;

      if (queryErr && import.meta.env.DEV) console.error('Erro ao carregar profissionais:', queryErr);
      else if (barbersData && barbersData.length > 0) setBarbers(barbersData);
      else setBarbers([]);
    } catch (err) {
      if (import.meta.env.DEV) console.error('ClientHome fetchData:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBarbers = barbers.filter((barber) =>
    barber.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (establishmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      {homeSettings?.hero_image_url && (
        <div className="relative w-full h-64 overflow-hidden">
          <img 
            src={homeSettings.hero_image_url} 
            alt="Hero" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        </div>
      )}

      {/* Header */}
      <header className={`px-5 pb-6 ${homeSettings?.hero_image_url ? '-mt-16 relative z-10' : 'pt-12'}`}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              {homeSettings?.title || 'BookNow'}
            </span>
          </button>
          
          {!user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/auth')}
              className="gap-2"
            >
              <LogIn className="w-4 h-4" />
              Entrar
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className="gap-2"
            >
              {profile?.full_name?.split(' ')[0]}
            </Button>
          )}
        </div>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {homeSettings?.title || 'BookNow'}
          </h1>
          {homeSettings?.subtitle && (
            <p className="text-muted-foreground text-sm mt-1">{homeSettings.subtitle}</p>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar profissional..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-card border-border rounded-xl text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </header>

      {/* Content */}
      <div className="px-5 pb-8">
        {/* Profissionais */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Nossos Profissionais</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-card rounded-2xl p-4 animate-pulse border border-border/50"
                >
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-3" />
                  <div className="h-4 bg-muted rounded w-20 mx-auto mb-2" />
                  <div className="h-3 bg-muted rounded w-24 mx-auto" />
                </div>
              ))}
            </div>
          ) : filteredBarbers.length === 0 ? (
            <div className="text-center py-12">
              <Scissors className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum profissional encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredBarbers.map((barber) => (
                <button
                  key={barber.id}
                  onClick={() => navigate(`/barber/${barber.id}`)}
                  className="bg-card rounded-2xl p-4 text-center group hover:bg-card/80 transition-colors border border-border/50"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 mx-auto mb-3 flex items-center justify-center group-hover:border-primary transition-colors overflow-hidden">
                    {barber.avatar_url ? (
                      <img
                        src={barber.avatar_url}
                        alt={barber.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Scissors className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <p className="font-medium text-foreground truncate">
                    {barber.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ver serviços
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="px-5 py-4 bg-muted/50 border-t border-border/50">
        <p className="text-center text-xs text-muted-foreground">
          Criado por Caio Borges.
        </p>
      </footer>
    </div>
  );
}
