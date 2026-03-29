import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO, isToday, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/contexts/ToastContext';
import { ArrowLeft, Clock, Loader2, DollarSign } from 'lucide-react';
import { ServiceImageThumb } from '@/components/ServiceImageThumb';

export default function BookAppointment() {
  const { barberId, serviceId } = useParams();
  const { user, profile } = useAuth();
  const { success, error: showError } = useToast();
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
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      if (!barberId || !serviceId) {
        setLoading(false);
        return;
      }

      try {
        // Carregar dados do profissional
        const { data: barber } = await supabase
          .from('profiles')
          .select('full_name, establishment_id')
          .eq('id', barberId)
          .single();
        
        if (barber) {
          setBarberName(barber.full_name);
          if (barber.establishment_id) {
            setEstablishmentId(barber.establishment_id);
            const { data: estData } = await supabase
              .from('establishments')
              .select('subscription_status')
              .eq('id', barber.establishment_id)
              .maybeSingle();

            setIsMaintenance(estData?.subscription_status === false);
          }
        }

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
        showError('Erro ao carregar dados do agendamento');
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
      
      // Verificar se o profissional atende neste dia
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
    if (isMaintenance) {
      showError('Sistema em Manutenção');
      return;
    }
    
    // Verificar se o telefone está verificado - só se não estiver verificado
    if (!profile?.is_verified) {
      sessionStorage.setItem('returnToBooking', window.location.pathname);
      sessionStorage.setItem(
        'pendingBooking',
        JSON.stringify({
          barberId,
          barber_id: barberId,
          establishment_id: establishmentId ?? undefined,
          serviceId,
          selectedDate,
          selectedTime,
          duration_minutes: service.duration_minutes,
        })
      );
      navigate('/verify-phone');
      return;
    }

    setIsBookingInProgress(true);
    setBooking(true);
    
    try {
      // Verificar se o Horário ainda está disponível
      const dayAppointments = appointments.filter(a => a.appointment_date === selectedDate);
      const slotStart = parseInt(selectedTime.split(':')[0]) * 60 + parseInt(selectedTime.split(':')[1]);
      const slotEnd = slotStart + service.duration_minutes;
      
      const isOccupied = dayAppointments.some(apt => {
        const aptStart = parseInt(apt.start_time.split(':')[0]) * 60 + parseInt(apt.start_time.split(':')[1]);
        const aptEnd = parseInt(apt.end_time.split(':')[0]) * 60 + parseInt(apt.end_time.split(':')[1]);
        
        // Verificar sobreposição
        return (slotStart < aptEnd && slotEnd > aptStart);
      });
      
      if (isOccupied) {
        showError('Este Horário acabou de ser ocupado. Escolha outro Horário.');
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

      const clientPhone = profile?.phone || profile?.phone_number || '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.functions.invoke('send-whatsapp-confirmation', {
          body: {
            client_name: profile?.full_name || 'Cliente',
            client_phone: clientPhone,
            barber_name: barberName,
            service_name: service?.name || '',
            appointment_date: selectedDate,
            appointment_time: selectedTime || '',
            service_price: service?.price,
            establishment_id: establishmentId || undefined,
          },
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        });
      } catch {
        // confirmação por WhatsApp é opcional; agendamento já foi salvo
      }

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

      success('Agendado com sucesso!');
      navigate('/appointments');
      
    } catch (error) {
      console.error('Erro ao agendar:', error);
      showError('Erro ao agendar. Tente novamente.');
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

  if (isMaintenance) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Sistema em Manutenção</h1>
          <p className="text-muted-foreground mb-4">
            A loja deste atendimento está em inadimplência no momento.
          </p>
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
            <ServiceImageThumb
              imageUrl={service.image_url}
              alt={service.name}
              className="h-12 w-12 rounded-xl"
            />
            <div>
              <h3 className="font-semibold">{service.name}</h3>
              <p className="text-sm text-muted-foreground">Profissional: {barberName}</p>
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
              disabled={booking || (user && !profile?.is_verified)}
              className="w-full h-14 text-lg font-semibold"
              size="lg"
            >
              {booking ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Agendando...
                </>
              ) : !user ? (
                'Fazer Login para Agendar'
              ) : !profile?.is_verified ? (
                'Verifique seu WhatsApp para Agendar'
              ) : (
                'Confirmar Agendamento'
              )}
            </Button>
            
            {/* Mensagem de verificação se necessário */}
            {user && !profile?.is_verified && (
              <div className="mt-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Você precisa verificar seu WhatsApp antes de agendar.
                </p>
                <Button
                  variant="link"
                  onClick={() => {
                    sessionStorage.setItem('returnToBooking', window.location.pathname);
                    if (selectedDate && selectedTime && service) {
                      sessionStorage.setItem(
                        'pendingBooking',
                        JSON.stringify({
                          barberId,
                          barber_id: barberId,
                          establishment_id: establishmentId ?? undefined,
                          serviceId,
                          selectedDate,
                          selectedTime,
                          duration_minutes: service.duration_minutes,
                        })
                      );
                    }
                    navigate('/verify-phone');
                  }}
                  className="text-primary text-sm p-0 h-auto"
                >
                  Verificar WhatsApp agora
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
