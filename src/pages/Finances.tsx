import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, DollarSign, TrendingUp, Calendar, Users } from 'lucide-react';

interface DailyStats {
  date: string;
  earnings: number;
  count: number;
}

export default function Finances() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [stats, setStats] = useState({
    total: 0,
    count: 0,
    average: 0,
    dailyStats: [] as DailyStats[],
  });

  useEffect(() => {
    if (profile?.id) {
      fetchStats();
    }
  }, [profile?.id, period]);

  const fetchStats = async () => {
    if (!profile?.id) return;
    setLoading(true);

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
      .select('appointment_date, service:services(price)')
      .eq('barber_id', profile.id)
      .eq('status', 'completed')
      .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
      .lte('appointment_date', format(endDate, 'yyyy-MM-dd'));

    if (data) {
      const totalEarnings = data.reduce(
        (sum, item) => sum + (Number((item.service as any)?.price) || 0),
        0
      );

      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const dailyStats = days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayAppointments = data.filter((a) => a.appointment_date === dateStr);
        const dayEarnings = dayAppointments.reduce(
          (sum, item) => sum + (Number((item.service as any)?.price) || 0),
          0
        );
        return {
          date: dateStr,
          earnings: dayEarnings,
          count: dayAppointments.length,
        };
      });

      setStats({
        total: totalEarnings,
        count: data.length,
        average: data.length > 0 ? totalEarnings / data.length : 0,
        dailyStats,
      });
    }
    setLoading(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const maxEarnings = Math.max(...stats.dailyStats.map((d) => d.earnings), 1);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-12 pb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
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

      {/* Stats Cards */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 border border-border/50 col-span-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Total faturado</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {loading ? '...' : formatPrice(stats.total)}
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
              {loading ? '...' : stats.count}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xs text-muted-foreground">Ticket médio</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {loading ? '...' : formatPrice(stats.average)}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-5 pb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Faturamento diário</h2>
        
        {loading ? (
          <div className="bg-card rounded-2xl p-4 border border-border/50 h-48 animate-pulse" />
        ) : (
          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-end gap-1 h-40">
              {stats.dailyStats.map((day, index) => {
                const height = maxEarnings > 0 ? (day.earnings / maxEarnings) * 100 : 0;
                const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
                
                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div className="w-full flex flex-col items-center justify-end h-32">
                      {day.earnings > 0 && (
                        <span className="text-xs text-muted-foreground mb-1">
                          {formatPrice(day.earnings)}
                        </span>
                      )}
                      <div
                        className={`w-full rounded-t-lg transition-all ${
                          isToday ? 'bg-primary' : 'bg-primary/30'
                        }`}
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                    </div>
                    <span className={`text-xs ${isToday ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      {format(new Date(day.date), 'EEE', { locale: ptBR }).slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
