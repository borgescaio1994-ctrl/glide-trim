import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Search, Scissors, Clock, DollarSign, ChevronRight, LogIn } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Barber {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  barber_id: string;
  barber?: Barber;
}

export default function ClientHome() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch barbers
      const { data: barbersData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('role', 'barber');

      if (barbersData) {
        setBarbers(barbersData);
      }

      // Fetch services with barber info
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true);

      if (servicesData && barbersData) {
        const servicesWithBarbers = servicesData.map((service) => ({
          ...service,
          barber: barbersData.find((b) => b.id === service.barber_id),
        }));
        setServices(servicesWithBarbers);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBarbers = barbers.filter((barber) =>
    barber.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.barber?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-semibold text-foreground">BarberPro</span>
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
          <p className="text-muted-foreground text-sm">Bem-vindo à</p>
          <h1 className="text-2xl font-bold text-foreground">BarberPro</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar barbeiro ou serviço..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-card border-border rounded-xl text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </header>

      {/* Content */}
      <div className="px-5 space-y-8 pb-8">
        {/* Barbers Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Barbeiros</h2>
            <button className="text-sm text-primary font-medium">Ver todos</button>
          </div>

          {loading ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-20 animate-pulse"
                >
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-2" />
                  <div className="h-3 bg-muted rounded w-14 mx-auto" />
                </div>
              ))}
            </div>
          ) : filteredBarbers.length === 0 ? (
            <div className="text-center py-8">
              <Scissors className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum barbeiro encontrado</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5">
              {filteredBarbers.map((barber) => (
                <button
                  key={barber.id}
                  onClick={() => navigate(`/barber/${barber.id}`)}
                  className="flex-shrink-0 w-20 text-center group"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 mx-auto mb-2 flex items-center justify-center group-hover:border-primary transition-colors overflow-hidden">
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
                  <p className="text-xs text-foreground font-medium truncate">
                    {barber.full_name.split(' ')[0]}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Services Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Serviços disponíveis</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-2xl p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-muted" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-24 mb-2" />
                      <div className="h-3 bg-muted rounded w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <Scissors className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum serviço disponível</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredServices.map((service) => (
                <button
                  key={service.id}
                  onClick={() =>
                    navigate(`/book/${service.barber_id}/${service.id}`)
                  }
                  className="w-full bg-card rounded-2xl p-4 flex items-center gap-4 group hover:bg-card/80 transition-colors border border-border/50"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Scissors className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-foreground mb-1">
                      {service.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {service.duration_minutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        {formatPrice(Number(service.price))}
                      </span>
                    </div>
                    {service.barber && (
                      <p className="text-xs text-muted-foreground mt-1">
                        por {service.barber.full_name}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
