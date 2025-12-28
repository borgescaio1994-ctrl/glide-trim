import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Scissors, 
  Trash2,
  PieChart,
  BarChart3,
  Crown,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Barber {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

interface ServiceStats {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface BarberStats {
  barber_id: string;
  barber_name: string;
  count: number;
  revenue: number;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [averageTicket, setAverageTicket] = useState(0);
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([]);
  const [barberStats, setBarberStats] = useState<BarberStats[]>([]);
  const [deletingBarber, setDeletingBarber] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchBarbers(),
      fetchFinancialStats(),
      fetchServiceStats(),
    ]);
    setLoading(false);
  };

  const fetchBarbers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'barber')
      .order('full_name');

    if (data) {
      setBarbers(data);
    }
  };

  const fetchFinancialStats = async () => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === 'week') {
      startDate = startOfWeek(today, { locale: ptBR });
      endDate = endOfWeek(today, { locale: ptBR });
    } else {
      startDate = startOfMonth(today);
      endDate = endOfMonth(today);
    }

    const { data } = await supabase
      .from('appointments')
      .select(`
        barber_id,
        service:services(price, name),
        barber:profiles!appointments_barber_id_fkey(full_name)
      `)
      .eq('status', 'completed')
      .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
      .lte('appointment_date', format(endDate, 'yyyy-MM-dd'));

    if (data) {
      const total = data.reduce(
        (sum, item) => sum + (Number((item.service as any)?.price) || 0),
        0
      );
      setTotalRevenue(total);
      setTotalAppointments(data.length);
      setAverageTicket(data.length > 0 ? total / data.length : 0);

      // Calculate barber stats
      const barberMap = new Map<string, BarberStats>();
      data.forEach((apt) => {
        const barberId = apt.barber_id;
        const barberName = (apt.barber as any)?.full_name || 'Desconhecido';
        const price = Number((apt.service as any)?.price) || 0;

        if (barberMap.has(barberId)) {
          const existing = barberMap.get(barberId)!;
          existing.count += 1;
          existing.revenue += price;
        } else {
          barberMap.set(barberId, {
            barber_id: barberId,
            barber_name: barberName,
            count: 1,
            revenue: price,
          });
        }
      });

      setBarberStats(Array.from(barberMap.values()).sort((a, b) => b.revenue - a.revenue));
    }
  };

  const fetchServiceStats = async () => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === 'week') {
      startDate = startOfWeek(today, { locale: ptBR });
      endDate = endOfWeek(today, { locale: ptBR });
    } else {
      startDate = startOfMonth(today);
      endDate = endOfMonth(today);
    }

    const { data } = await supabase
      .from('appointments')
      .select('service:services(name, price)')
      .eq('status', 'completed')
      .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
      .lte('appointment_date', format(endDate, 'yyyy-MM-dd'));

    if (data) {
      const serviceMap = new Map<string, { count: number; revenue: number }>();
      
      data.forEach((apt) => {
        const name = (apt.service as any)?.name || 'Outro';
        const price = Number((apt.service as any)?.price) || 0;

        if (serviceMap.has(name)) {
          const existing = serviceMap.get(name)!;
          existing.count += 1;
          existing.revenue += price;
        } else {
          serviceMap.set(name, { count: 1, revenue: price });
        }
      });

      const total = data.length;
      const stats: ServiceStats[] = [];
      
      serviceMap.forEach((value, name) => {
        stats.push({
          name,
          count: value.count,
          revenue: value.revenue,
          percentage: total > 0 ? (value.count / total) * 100 : 0,
        });
      });

      setServiceStats(stats.sort((a, b) => b.count - a.count));
    }
  };

  const handleDeleteBarber = async (barberId: string) => {
    setDeletingBarber(barberId);

    try {
      // Delete appointments first
      await supabase
        .from('appointments')
        .delete()
        .eq('barber_id', barberId);

      // Delete services
      await supabase
        .from('services')
        .delete()
        .eq('barber_id', barberId);

      // Delete schedules
      await supabase
        .from('barber_schedules')
        .delete()
        .eq('barber_id', barberId);

      // Delete gallery
      await supabase
        .from('barber_gallery')
        .delete()
        .eq('barber_id', barberId);

      // Delete profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', barberId);

      if (error) throw error;

      toast.success('Barbeiro removido com sucesso');
      fetchBarbers();
    } catch (error: any) {
      console.error('Error deleting barber:', error);
      toast.error('Erro ao remover barbeiro');
    } finally {
      setDeletingBarber(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const pieColors = [
    'hsl(var(--primary))',
    'hsl(142, 76%, 36%)',
    'hsl(221, 83%, 53%)',
    'hsl(262, 83%, 58%)',
    'hsl(31, 97%, 52%)',
    'hsl(350, 89%, 60%)',
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-5 pt-12 pb-6 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Painel Admin</h1>
          </div>
        </div>

        {/* Period Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
              period === 'week'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground border border-border'
            }`}
          >
            Esta semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
              period === 'month'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground border border-border'
            }`}
          >
            Este mês
          </button>
        </div>
      </header>

      {/* Financial Overview */}
      <div className="px-5 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Visão Geral Financeira
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 border border-border/50 col-span-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Faturamento Total</span>
            </div>
            <p className="text-4xl font-bold text-foreground">
              {loading ? '...' : formatPrice(totalRevenue)}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-xs text-muted-foreground">Atendimentos</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {loading ? '...' : totalAppointments}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xs text-muted-foreground">Ticket Médio</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {loading ? '...' : formatPrice(averageTicket)}
            </p>
          </div>
        </div>
      </div>

      {/* Service Distribution - Pie Chart */}
      <div className="px-5 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-primary" />
          Serviços Realizados
        </h2>

        {loading ? (
          <div className="bg-card rounded-2xl p-4 border border-border/50 h-48 animate-pulse" />
        ) : serviceStats.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhum serviço realizado no período</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-4 border border-border/50">
            {/* Simple Pie Representation */}
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
                  {serviceStats.reduce((acc, stat, index) => {
                    const offset = acc.offset;
                    const percentage = stat.percentage;
                    const circumference = 2 * Math.PI * 10;
                    const strokeDasharray = (percentage / 100) * circumference;
                    
                    acc.elements.push(
                      <circle
                        key={stat.name}
                        cx="16"
                        cy="16"
                        r="10"
                        fill="none"
                        stroke={pieColors[index % pieColors.length]}
                        strokeWidth="6"
                        strokeDasharray={`${strokeDasharray} ${circumference}`}
                        strokeDashoffset={-offset}
                        className="transition-all duration-500"
                      />
                    );
                    
                    acc.offset += strokeDasharray;
                    return acc;
                  }, { offset: 0, elements: [] as JSX.Element[] }).elements}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-foreground">{totalAppointments}</span>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                {serviceStats.slice(0, 5).map((stat, index) => (
                  <div key={stat.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: pieColors[index % pieColors.length] }}
                    />
                    <span className="text-sm text-muted-foreground flex-1 truncate">
                      {stat.name}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {stat.percentage.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Revenue by Barber */}
      <div className="px-5 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-primary" />
          Faturamento por Barbeiro
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-4 animate-pulse border border-border/50">
                <div className="h-4 bg-muted rounded w-24 mb-2" />
                <div className="h-6 bg-muted rounded w-32" />
              </div>
            ))}
          </div>
        ) : barberStats.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhum atendimento no período</p>
          </div>
        ) : (
          <div className="space-y-3">
            {barberStats.map((stat, index) => {
              const maxRevenue = barberStats[0]?.revenue || 1;
              const widthPercent = (stat.revenue / maxRevenue) * 100;

              return (
                <div key={stat.barber_id} className="bg-card rounded-2xl p-4 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-medium text-foreground">{stat.barber_name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{stat.count} atend.</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  <p className="text-lg font-bold text-foreground">{formatPrice(stat.revenue)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Barber Management */}
      <div className="px-5 pb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Gerenciar Barbeiros
        </h2>

        {barbers.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhum barbeiro cadastrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {barbers.map((barber) => (
              <div 
                key={barber.id} 
                className="bg-card rounded-2xl p-4 border border-border/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    {barber.avatar_url ? (
                      <img 
                        src={barber.avatar_url} 
                        alt={barber.full_name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <Scissors className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{barber.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{barber.email}</p>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover barbeiro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá remover permanentemente o barbeiro <strong>{barber.full_name}</strong> e todos os seus dados (serviços, agendamentos, galeria).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteBarber(barber.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {deletingBarber === barber.id ? 'Removendo...' : 'Remover'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
