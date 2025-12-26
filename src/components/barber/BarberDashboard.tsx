import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, DollarSign, TrendingUp, Users, Check, X, ChevronLeft, ChevronRight, Scissors, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Appointment {
  id: string;
  client_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  client?: {
    full_name: string;
  };
  service?: {
    name: string;
    price: number;
    duration_minutes: number;
  };
}

interface BarberDashboardProps {
  isAdmin?: boolean;
}

export default function BarberDashboard({ isAdmin = false }: BarberDashboardProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayEarnings: 0,
    weekEarnings: 0,
    monthEarnings: 0,
    todayAppointments: 0,
  });

  useEffect(() => {
    if (profile?.id) {
      fetchAppointments();
      fetchStats();
    }
  }, [profile?.id, selectedDate]);

  const fetchAppointments = async () => {
    if (!profile?.id) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        client:profiles!appointments_client_id_fkey(full_name),
        service:services(name, price, duration_minutes)
      `)
      .eq('barber_id', profile.id)
      .eq('appointment_date', dateStr)
      .order('start_time', { ascending: true });

    if (data) {
      setAppointments(data as any);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    if (!profile?.id) return;

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(today, { locale: ptBR }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(today, { locale: ptBR }), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');

    // Today's appointments count
    const { data: todayAppts } = await supabase
      .from('appointments')
      .select('id')
      .eq('barber_id', profile.id)
      .eq('appointment_date', todayStr)
      .eq('status', 'scheduled');

    // Today's earnings
    const { data: todayData } = await supabase
      .from('appointments')
      .select('service:services(price)')
      .eq('barber_id', profile.id)
      .eq('appointment_date', todayStr)
      .eq('status', 'completed');

    // Week earnings
    const { data: weekData } = await supabase
      .from('appointments')
      .select('service:services(price)')
      .eq('barber_id', profile.id)
      .gte('appointment_date', weekStart)
      .lte('appointment_date', weekEnd)
      .eq('status', 'completed');

    // Month earnings
    const { data: monthData } = await supabase
      .from('appointments')
      .select('service:services(price)')
      .eq('barber_id', profile.id)
      .gte('appointment_date', monthStart)
      .lte('appointment_date', monthEnd)
      .eq('status', 'completed');

    const sumPrices = (data: any[]) =>
      data?.reduce((sum, item) => sum + (Number(item.service?.price) || 0), 0) || 0;

    setStats({
      todayAppointments: todayAppts?.length || 0,
      todayEarnings: sumPrices(todayData || []),
      weekEarnings: sumPrices(weekData || []),
      monthEarnings: sumPrices(monthData || []),
    });
  };

  const updateAppointmentStatus = async (id: string, status: 'completed' | 'cancelled') => {
    await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);
    
    fetchAppointments();
    fetchStats();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-primary/10 text-primary';
      case 'completed':
        return 'bg-green-500/10 text-green-500';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Agendado';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
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

          {isAdmin && (
            <Button
              onClick={() => navigate('/admin')}
              variant="outline"
              className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
            >
              <Crown className="w-4 h-4" />
              Painel
            </Button>
          )}
        </div>
        <div className="mb-6">
          <p className="text-muted-foreground text-sm">Olá,</p>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {profile?.full_name?.split(' ')[0]}
            {isAdmin && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Admin</span>
            )}
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary" />
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
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xs text-muted-foreground">Semana</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatPrice(stats.weekEarnings)}</p>
            <p className="text-xs text-muted-foreground">faturado</p>
          </div>

          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-purple-500" />
              </div>
              <span className="text-xs text-muted-foreground">Mês</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatPrice(stats.monthEarnings)}</p>
            <p className="text-xs text-muted-foreground">faturado</p>
          </div>
        </div>
      </header>

      {/* Date Selector */}
      <div className="px-5 mb-4">
        <div className="flex items-center justify-between bg-card rounded-xl p-3 border border-border/50">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isToday(selectedDate) ? 'Hoje' : format(selectedDate, "EEEE", { locale: ptBR })}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Appointments */}
      <div className="px-5 pb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Agenda do dia</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-4 animate-pulse border border-border/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-24 mb-2" />
                    <div className="h-3 bg-muted rounded w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum agendamento para este dia</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-card rounded-2xl p-4 border border-border/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {appointment.client?.full_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {appointment.service?.name}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(appointment.status)}`}>
                    {getStatusText(appointment.status)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {appointment.start_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {formatPrice(Number(appointment.service?.price || 0))}
                    </span>
                  </div>

                  {appointment.status === 'scheduled' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                        className="p-2 bg-green-500/10 rounded-lg hover:bg-green-500/20 transition-colors"
                      >
                        <Check className="w-4 h-4 text-green-500" />
                      </button>
                      <button
                        onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                        className="p-2 bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors"
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
