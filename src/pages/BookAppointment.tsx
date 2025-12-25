import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, addDays, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Calendar, Clock, DollarSign, Scissors, Check, Loader2 } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  barber_id: string;
}

interface BarberSchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface Appointment {
  appointment_date: string;
  start_time: string;
  end_time: string;
}

export default function BookAppointment() {
  const { barberId, serviceId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [service, setService] = useState<Service | null>(null);
  const [barberName, setBarberName] = useState('');
  const [schedules, setSchedules] = useState<BarberSchedule[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (barberId && serviceId) {
      fetchData();
    }
  }, [barberId, serviceId]);

  const fetchData = async () => {
    try {
      // Fetch service
      const { data: serviceData } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (serviceData) {
        setService(serviceData);
      }

      // Fetch barber name
      const { data: barberData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', barberId)
        .single();

      if (barberData) {
        setBarberName(barberData.full_name);
      }

      // Fetch barber schedules
      const { data: schedulesData } = await supabase
        .from('barber_schedules')
        .select('*')
        .eq('barber_id', barberId)
        .eq('is_active', true);

      if (schedulesData) {
        setSchedules(schedulesData);
      }

      // Fetch existing appointments for next 30 days
      const startDate = format(new Date(), 'yyyy-MM-dd');
      const endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');

      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('appointment_date, start_time, end_time')
        .eq('barber_id', barberId)
        .eq('status', 'scheduled')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate);

      if (appointmentsData) {
        setAppointments(appointmentsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableDates = () => {
    const dates: Date[] = [];
    const today = startOfDay(new Date());

    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      const dayOfWeek = date.getDay();
      const hasSchedule = schedules.some((s) => s.day_of_week === dayOfWeek);

      if (hasSchedule) {
        dates.push(date);
      }
    }

    return dates;
  };

  const getAvailableTimeSlots = (dateStr: string) => {
    if (!service) return [];

    const date = parseISO(dateStr);
    const dayOfWeek = date.getDay();
    const schedule = schedules.find((s) => s.day_of_week === dayOfWeek);

    if (!schedule) return [];

    const slots: string[] = [];
    const startHour = parseInt(schedule.start_time.split(':')[0]);
    const startMin = parseInt(schedule.start_time.split(':')[1]);
    const endHour = parseInt(schedule.end_time.split(':')[0]);
    const endMin = parseInt(schedule.end_time.split(':')[1]);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Get appointments for this date
    const dayAppointments = appointments.filter((a) => a.appointment_date === dateStr);

    for (let time = startMinutes; time + service.duration_minutes <= endMinutes; time += 30) {
      const hours = Math.floor(time / 60);
      const mins = time % 60;
      const slotStart = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      const slotEndTime = time + service.duration_minutes;
      const slotEnd = `${Math.floor(slotEndTime / 60).toString().padStart(2, '0')}:${(slotEndTime % 60).toString().padStart(2, '0')}`;

      // Check if slot conflicts with any existing appointment
      const hasConflict = dayAppointments.some((apt) => {
        const aptStart = apt.start_time.slice(0, 5);
        const aptEnd = apt.end_time.slice(0, 5);
        return (slotStart < aptEnd && slotEnd > aptStart);
      });

      // Check if slot is in the past
      const now = new Date();
      const slotDate = parseISO(dateStr);
      slotDate.setHours(hours, mins, 0, 0);
      const isInPast = isBefore(slotDate, now);

      if (!hasConflict && !isInPast) {
        slots.push(slotStart);
      }
    }

    return slots;
  };

  const handleBook = async () => {
    if (!profile?.id || !service || !selectedDate || !selectedTime) return;

    setBooking(true);

    try {
      const startMinutes = parseInt(selectedTime.split(':')[0]) * 60 + parseInt(selectedTime.split(':')[1]);
      const endMinutes = startMinutes + service.duration_minutes;
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

      const { error } = await supabase.from('appointments').insert({
        client_id: profile.id,
        barber_id: barberId,
        service_id: serviceId,
        appointment_date: selectedDate,
        start_time: selectedTime,
        end_time: endTime,
        status: 'scheduled',
      });

      if (error) throw error;

      toast.success('Agendamento realizado com sucesso!');
      navigate('/appointments');
    } catch (error: any) {
      toast.error('Erro ao realizar agendamento');
      console.error(error);
    } finally {
      setBooking(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const availableDates = getAvailableDates();
  const availableTimeSlots = selectedDate ? getAvailableTimeSlots(selectedDate) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-12 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Agendar</h1>
        </div>

        {/* Service Card */}
        {service && (
          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Scissors className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-foreground">{service.name}</h2>
                <p className="text-sm text-muted-foreground">com {barberName}</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {service.duration_minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    {formatPrice(Number(service.price))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Date Selection */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Escolha uma data
        </h3>
        
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
          {availableDates.map((date) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={dateStr}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setSelectedTime(null);
                }}
                className={`flex-shrink-0 w-16 py-3 rounded-xl text-center transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-foreground hover:border-primary'
                }`}
              >
                <p className="text-xs uppercase">
                  {format(date, 'EEE', { locale: ptBR })}
                </p>
                <p className="text-lg font-semibold">{format(date, 'd')}</p>
                <p className="text-xs">{format(date, 'MMM', { locale: ptBR })}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div className="px-5 mb-6 animate-fade-in">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Escolha um horário
          </h3>

          {availableTimeSlots.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                Nenhum horário disponível nesta data
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {availableTimeSlots.map((time) => {
                const isSelected = selectedTime === time;

                return (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border text-foreground hover:border-primary'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirm Button */}
      {selectedDate && selectedTime && (
        <div className="px-5 pb-8 animate-fade-in">
          <div className="bg-card rounded-2xl p-4 border border-border/50 mb-4">
            <h3 className="font-medium text-foreground mb-2">Resumo do agendamento</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {format(parseISO(selectedDate), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Clock className="w-4 h-4" />
              <span>{selectedTime}</span>
            </div>
          </div>

          <Button
            onClick={handleBook}
            disabled={booking}
            className="w-full h-12 bg-primary hover:bg-primary/90"
          >
            {booking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Confirmar agendamento
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
