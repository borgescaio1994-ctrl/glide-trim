import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO, isToday, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Loader2, Scissors, DollarSign, User } from 'lucide-react';

export default function BookAppointment() {
  const { barberId, serviceId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  // Estados
  const [barberName, setBarberName] = useState('');
  const [service, setService] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [isBookingInProgress, setIsBookingInProgress] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      if (!barberId || !serviceId) return;
      
      try {
        // Carregar dados do barbeiro
        const { data: barber } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', barberId)
          .single();
        
        if (barber) setBarberName(barber.full_name);

        // Carregar serviço
        const { data: serviceData } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .single();
        
        if (serviceData) setService(serviceData);

        // Carregar horários de trabalho
        const { data: schedulesData } = await supabase
          .from('barber_schedules')
          .select('*')
          .eq('barber_id', barberId)
          .eq('is_active', true);
        
        if (schedulesData) setSchedules(schedulesData);

        // Carregar agendamentos existentes
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('*')
          .eq('barber_id', barberId)
          .eq('status', 'scheduled');
        
        if (appointmentsData) setAppointments(appointmentsData);

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados do agendamento');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [barberId, serviceId]);

  // Verificar se uma data tem horários disponíveis
  const checkAvailableSlots = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    const schedule = schedules.find(s => s.day_of_week === dayOfWeek);
    
    if (!schedule || !service) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const startMinutes = parseInt(schedule.start_time.split(':')[0]) * 60 + parseInt(schedule.start_time.split(':')[1]);
    const endMinutes = parseInt(schedule.end_time.split(':')[0]) * 60 + parseInt(schedule.end_time.split(':')[1]);
    
    // Filtrar agendamentos do dia
    const dayAppointments = appointments.filter(a => a.appointment_date === dateStr);
    
    // Verificar cada slot de 30 minutos
    for (let slotStart = startMinutes; slotStart + service.duration_minutes <= endMinutes; slotStart += 30) {
      const slotEnd = slotStart + service.duration_minutes;
      
      // Verificar se o slot não está ocupado
      const isOccupied = dayAppointments.some(apt => {
        const aptStart = parseInt(apt.start_time.split(':')[0]) * 60 + parseInt(apt.start_time.split(':')[1]);
        const aptEnd = parseInt(apt.end_time.split(':')[0]) * 60 + parseInt(apt.end_time.split(':')[1]);
        
        // Verificar sobreposição
        return (slotStart < aptEnd && slotEnd > aptStart);
      });
      
      if (!isOccupied) {
        // Se for hoje, verificar se o horário já passou
        if (isToday(date)) {
          const slotTime = new Date();
          slotTime.setHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0);
          if (slotTime > new Date()) {
            return true; // Encontrou um slot disponível
          }
        } else {
          return true; // Encontrou um slot disponível
        }
      }
    }
    
    return false; // Nenhum slot disponível
  };

  // Calcular datas disponíveis
  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    const today = startOfDay(new Date());
    
    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      const dayOfWeek = date.getDay();
      
      // Verificar se o barbeiro trabalha neste dia
      const schedule = schedules.find(s => s.day_of_week === dayOfWeek);
      if (!schedule) continue;
      
      // Verificar se há horários disponíveis neste dia
      const hasSlots = checkAvailableSlots(date);
      if (hasSlots) {
        dates.push(date);
      }
    }
    
    return dates;
  }, [schedules, appointments, service]);

  // Calcular horários disponíveis para a data selecionada
  const availableSlots = useMemo(() => {
    if (!selectedDate || !service) return [];
    
    const date = parseISO(selectedDate);
    const dayOfWeek = date.getDay();
    const schedule = schedules.find(s => s.day_of_week === dayOfWeek);
    
    if (!schedule) return [];
    
    const startMinutes = parseInt(schedule.start_time.split(':')[0]) * 60 + parseInt(schedule.start_time.split(':')[1]);
    const endMinutes = parseInt(schedule.end_time.split(':')[0]) * 60 + parseInt(schedule.end_time.split(':')[1]);
    
    // Filtrar agendamentos do dia
    const dayAppointments = appointments.filter(a => a.appointment_date === selectedDate);
    
    const slots: string[] = [];
    
    // Gerar slots de 30 em 30 minutos
    for (let slotStart = startMinutes; slotStart + service.duration_minutes <= endMinutes; slotStart += 30) {
      const slotEnd = slotStart + service.duration_minutes;
      const timeStr = `${Math.floor(slotStart / 60).toString().padStart(2, '0')}:${(slotStart % 60).toString().padStart(2, '0')}`;
      
      // Verificar se o slot está ocupado
      const isOccupied = dayAppointments.some(apt => {
        const aptStart = parseInt(apt.start_time.split(':')[0]) * 60 + parseInt(apt.start_time.split(':')[1]);
        const aptEnd = parseInt(apt.end_time.split(':')[0]) * 60 + parseInt(apt.end_time.split(':')[1]);
        
        // Verificar sobreposição
        return (slotStart < aptEnd && slotEnd > aptStart);
      });
      
      // Se não estiver ocupado, adicionar à lista
      if (!isOccupied) {
        // Se for hoje, verificar se o horário já passou
        if (isToday(date)) {
          const slotTime = new Date();
          slotTime.setHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0);
          if (slotTime > new Date()) {
            slots.push(timeStr);
          }
        } else {
          slots.push(timeStr);
        }
      }
    }
    
    return slots;
  }, [selectedDate, schedules, appointments, service]);

  // Confirmar agendamento
  const handleBook = async () => {
    if (!user || !selectedDate || !selectedTime || !service || isBookingInProgress) return;
    
    setIsBookingInProgress(true);
    setBooking(true);
    
    try {
      // Verificar se o horário ainda está disponível
      const dayAppointments = appointments.filter(a => a.appointment_date === selectedDate);
      const slotStart = parseInt(selectedTime.split(':')[0]) * 60 + parseInt(selectedTime.split(':')[1]);
      const slotEnd = slotStart + service.duration_minutes;
      
      const isOccupied = dayAppointments.some(apt => {
        const aptStart = parseInt(apt.start_time.split(':')[0]) * 60 + parseInt(apt.start_time.split(':')[1]);
        const aptEnd = parseInt(apt.end_time.split(':')[0]) * 60 + parseInt(apt.end_time.split(':')[1]);
        return (slotStart < aptEnd && slotEnd > aptStart);
      });
      
      if (isOccupied) {
        toast.error('Este horário acabou de ser ocupado. Escolha outro horário.');
        return;
      }
      
      // Inserir agendamento
      const { error } = await supabase.from('appointments').insert({
        client_id: user.id,
        barber_id: barberId,
        service_id: serviceId,
        appointment_date: selectedDate,
        start_time: selectedTime,
        end_time: `${Math.floor(slotEnd / 60).toString().padStart(2, '0')}:${(slotEnd % 60).toString().padStart(2, '0')}`,
        status: 'scheduled',
      });
      
      if (error) throw error;
      
      // Adicionar à lista local para atualizar imediatamente
      const newAppointment = {
        client_id: user.id,
        barber_id: barberId,
        service_id: serviceId,
        appointment_date: selectedDate,
        start_time: selectedTime,
        end_time: `${Math.floor(slotEnd / 60).toString().padStart(2, '0')}:${(slotEnd % 60).toString().padStart(2, '0')}`,
        status: 'scheduled',
      };
      
      setAppointments(prev => [...prev, newAppointment]);
      setSelectedTime(null);
      
      toast.success('Agendado com sucesso!');
      navigate('/appointments');
      
    } catch (error) {
      console.error('Erro ao agendar:', error);
      toast.error('Erro ao agendar. Tente novamente.');
    } finally {
      setBooking(false);
      setIsBookingInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary w-8 h-8 mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!service || !barberName) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4">Dados não encontrados</h1>
          <Button onClick={() => navigate('/')}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-5">
        <header className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold">Agendar Horário</h1>
        </header>

        {/* Informações do serviço */}
        <div className="bg-card rounded-xl p-4 mb-6 border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scissors className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{service.name}</h3>
              <p className="text-sm text-muted-foreground">com {barberName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {service.duration_minutes} min
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              R$ {service.price}
            </span>
          </div>
        </div>

        {/* Calendário */}
        <div className="mb-6">
          <h2 className="font-semibold mb-4">1. Escolha a data</h2>
          <Calendar
            mode="single"
            selected={selectedDate ? parseISO(selectedDate) : undefined}
            onSelect={(date) => {
              if (date) {
                setSelectedDate(format(date, 'yyyy-MM-dd'));
                setSelectedTime(null);
              }
            }}
            disabled={(date) => {
              // Desabilitar datas passadas
              if (date < startOfDay(new Date())) return true;
              
              // Desabilitar datas sem horários disponíveis
              return !checkAvailableSlots(date);
            }}
            modifiers={{
              available: (date) => checkAvailableSlots(date),
            }}
            modifiersStyles={{
              available: { 
                backgroundColor: 'hsl(var(--primary))', 
                color: 'hsl(var(--primary-foreground))',
                fontWeight: 'bold'
              }
            }}
            className="rounded-lg border"
            locale={ptBR}
          />
        </div>

        {/* Horários disponíveis */}
        {selectedDate && (
          <div className="mb-6">
            <h2 className="font-semibold mb-4">2. Escolha o horário</h2>
            {availableSlots.length === 0 ? (
              <div className="text-center py-8 bg-muted/30 rounded-xl">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum horário disponível para esta data</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => setSelectedTime(slot)}
                    className={`py-3 rounded-xl border-2 font-bold transition-all ${
                      selectedTime === slot
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card border-border hover:border-primary/50'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Botão de confirmar */}
        {selectedDate && selectedTime && (
          <div className="mt-8 mb-8">
            <Button
              onClick={user ? handleBook : () => navigate('/auth')}
              disabled={booking}
              className="w-full h-14 text-lg font-semibold"
              size="lg"
            >
              {booking ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Agendando...
                </>
              ) : user ? (
                'Confirmar Agendamento'
              ) : (
                'Fazer Login para Agendar'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
