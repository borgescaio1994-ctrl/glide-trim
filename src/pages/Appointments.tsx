import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO, isPast, isToday, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Calendar, Clock, DollarSign, User, X, Scissors } from 'lucide-react';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  barber?: {
    full_name: string;
  };
  client?: {
    full_name: string;
  };
  service?: {
    name: string;
    price: number;
    duration_minutes: number;
  };
}

export default function Appointments() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    if (profile?.id) {
      fetchAppointments();
    }
  }, [profile?.id]);

  const fetchAppointments = async () => {
    if (!profile?.id) return;

    const column = profile.role === 'barber' ? 'barber_id' : 'client_id';
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        barber:profiles!appointments_barber_id_fkey(full_name),
        client:profiles!appointments_client_id_fkey(full_name),
        service:services(name, price, duration_minutes)
      `)
      .eq(column, profile.id)
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (data) {
      setAppointments(data as any);
    }
    setLoading(false);
  };

  const cancelAppointment = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao cancelar agendamento');
    } else {
      toast.success('Agendamento cancelado');
      fetchAppointments();
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
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

  const filteredAppointments = appointments.filter((apt) => {
    const aptDate = parseISO(apt.appointment_date);
    if (filter === 'upcoming') {
      return (isToday(aptDate) || isFuture(aptDate)) && apt.status === 'scheduled';
    }
    return isPast(aptDate) || apt.status !== 'scheduled';
  });

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
          <h1 className="text-2xl font-bold text-foreground">Agendamentos</h1>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('upcoming')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
              filter === 'upcoming'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground border border-border'
            }`}
          >
            Próximos
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
              filter === 'past'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground border border-border'
            }`}
          >
            Histórico
          </button>
        </div>
      </header>

      {/* Appointments List */}
      <div className="px-5 pb-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-4 animate-pulse border border-border/50">
                <div className="h-5 bg-muted rounded w-32 mb-2" />
                <div className="h-4 bg-muted rounded w-48" />
              </div>
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {filter === 'upcoming'
                ? 'Nenhum agendamento próximo'
                : 'Nenhum agendamento no histórico'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-card rounded-2xl p-4 border border-border/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Scissors className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {appointment.service?.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {profile?.role === 'client'
                          ? `com ${appointment.barber?.full_name}`
                          : appointment.client?.full_name}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(appointment.status)}`}>
                    {getStatusText(appointment.status)}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(parseISO(appointment.appointment_date), "d 'de' MMM", { locale: ptBR })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {appointment.start_time.slice(0, 5)}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {formatPrice(Number(appointment.service?.price || 0))}
                  </span>
                </div>

                {appointment.status === 'scheduled' && (
                  <button
                    onClick={() => cancelAppointment(appointment.id)}
                    className="w-full py-2 bg-destructive/10 text-destructive rounded-xl text-sm font-medium hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancelar agendamento
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
