import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Crown, DollarSign, TrendingUp, Users, Scissors, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function AdminHome() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todayEarnings: 0,
    weekEarnings: 0,
    monthEarnings: 0,
    totalBarbers: 0,
    todayAppointments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(today, { locale: ptBR }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(today, { locale: ptBR }), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');

    // Total barbers
    const { data: barbers } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'barber');

    // Today's appointments count (all barbers)
    const { data: todayAppts } = await supabase
      .from('appointments')
      .select('id')
      .eq('appointment_date', todayStr)
      .eq('status', 'scheduled');

    // Today's earnings (all barbers)
    const { data: todayData } = await supabase
      .from('appointments')
      .select('service:services(price)')
      .eq('appointment_date', todayStr)
      .eq('status', 'completed');

    // Week earnings (all barbers)
    const { data: weekData } = await supabase
      .from('appointments')
      .select('service:services(price)')
      .gte('appointment_date', weekStart)
      .lte('appointment_date', weekEnd)
      .eq('status', 'completed');

    // Month earnings (all barbers)
    const { data: monthData } = await supabase
      .from('appointments')
      .select('service:services(price)')
      .gte('appointment_date', monthStart)
      .lte('appointment_date', monthEnd)
      .eq('status', 'completed');

    const sumPrices = (data: any[]) =>
      data?.reduce((sum, item) => sum + (Number(item.service?.price) || 0), 0) || 0;

    setStats({
      totalBarbers: barbers?.length || 0,
      todayAppointments: todayAppts?.length || 0,
      todayEarnings: sumPrices(todayData || []),
      weekEarnings: sumPrices(weekData || []),
      monthEarnings: sumPrices(monthData || []),
    });
    setLoading(false);
  };

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

          <Button
            onClick={() => navigate('/admin')}
            variant="outline"
            className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
          >
            <Crown className="w-4 h-4" />
            Painel Admin
          </Button>
        </div>

        <div className="mb-6">
          <p className="text-muted-foreground text-sm">Bem-vindo,</p>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {profile?.full_name?.split(' ')[0]}
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Dono
            </span>
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Barbeiros</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalBarbers}</p>
            <p className="text-xs text-muted-foreground">cadastrados</p>
          </div>

          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xs text-muted-foreground">Hoje</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.todayAppointments}</p>
            <p className="text-xs text-muted-foreground">agendamentos</p>
          </div>

          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-xs text-muted-foreground">Hoje</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatPrice(stats.todayEarnings)}</p>
            <p className="text-xs text-muted-foreground">faturado</p>
          </div>

          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-purple-500" />
              </div>
              <span className="text-xs text-muted-foreground">Semana</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatPrice(stats.weekEarnings)}</p>
            <p className="text-xs text-muted-foreground">faturado</p>
          </div>
        </div>

        {/* Month Summary */}
        <div className="mt-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Faturamento do Mês</p>
              <p className="text-3xl font-bold text-foreground">{formatPrice(stats.monthEarnings)}</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-primary" />
            </div>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="px-5 pb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Ações Rápidas</h2>
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => navigate('/admin')}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 border-border/50"
          >
            <Crown className="w-6 h-6 text-primary" />
            <span className="text-sm">Painel Admin</span>
          </Button>

          <Button
            onClick={() => navigate('/gallery')}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 border-border/50"
          >
            <Scissors className="w-6 h-6 text-primary" />
            <span className="text-sm">Ver Galeria</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
