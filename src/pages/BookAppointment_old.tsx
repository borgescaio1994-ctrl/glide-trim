import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO, isToday, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfDay } from 'date-fns';
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
  
  // VERIFICAÇÃO DE PARÂMETROS
  console.log('🔵 BookAppointment montado');
  console.log('🔵 barberId:', barberId);
  console.log('🔵 serviceId:', serviceId);
  console.log('🔵 URL atual:', window.location.href);
  
  if (!barberId || !serviceId) {
    console.error('🔴 barberId ou serviceId não encontrados na URL');
    console.error('🔴 barberId:', barberId);
    console.error('🔴 serviceId:', serviceId);
    
    // Redirecionar para home se parâmetros faltarem
    useEffect(() => {
      console.log('🔵 Redirecionando para home devido a parâmetros ausentes...');
      navigate('/');
    }, [navigate]);
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4">Agendamento não encontrado</h1>
          <p className="text-muted-foreground mb-4">URL inválida ou incompleta</p>
          <Button onClick={() => navigate('/')}>Voltar para Home</Button>
        </div>
      </div>
    );
  }
  
  // USUÁRIO PODE NAVEGAR LIVREMENTE - SÓ BLOQUEIA NO BOTÃO CONFIRMAR
  const [service, setService] = useState<any>(null);
  const [barberName, setBarberName] = useState('');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [isBookingInProgress, setIsBookingInProgress] = useState(false);

  useEffect(() => {
    if (barberId && serviceId) fetchData();
  }, [barberId, serviceId]);

  const fetchData = async () => {
    console.log('🔵 fetchData iniciado...');
    console.log('🔵 barberId:', barberId);
    console.log('🔵 serviceId:', serviceId);
    
    try {
      console.log('🔵 Buscando service...');
      const { data: serviceData, error: serviceError } = await supabase.from('services').select('*').eq('id', serviceId).single();
      console.log('🔵 Service result:', { serviceData, serviceError });
      if (serviceError) {
        console.error('🔴 Erro ao buscar service:', serviceError);
        throw serviceError;
      }
      if (serviceData) setService(serviceData);
      
      console.log('🔵 Buscando barber name...');
      const { data: barberData, error: barberError } = await supabase.from('profiles').select('full_name').eq('id', barberId).single();
      console.log('🔵 Barber result:', { barberData, barberError });
      if (barberError) {
        console.error('🔴 Erro ao buscar barber:', barberError);
        throw barberError;
      }
      if (barberData) setBarberName(barberData.full_name);
      
      console.log('🔵 Buscando schedules...');
      const { data: schedulesData, error: schedulesError } = await supabase.from('barber_schedules').select('*').eq('barber_id', barberId).eq('is_active', true);
      console.log('🔵 Schedules result:', { schedulesData, schedulesError });
      if (schedulesError) {
        console.error('🔴 Erro ao buscar schedules:', schedulesError);
        throw schedulesError;
      }
      if (schedulesData) setSchedules(schedulesData);
      
      console.log('🔵 Buscando appointments...');
      const { data: appointmentsData, error: appointmentsError } = await supabase.from('appointments').select('appointment_date, start_time, end_time').eq('barber_id', barberId).eq('status', 'scheduled');
      console.log('🔵 Appointments result:', { appointmentsData, appointmentsError });
      if (appointmentsError) {
        console.error('🔴 Erro ao buscar appointments:', appointmentsError);
        throw appointmentsError;
      }
      if (appointmentsData) setAppointments(appointmentsData);
      
      console.log('✅ fetchData concluído com sucesso!');
    } catch (e) {
      console.error('🔴 Erro completo em fetchData:', e);
      toast.error('Erro ao carregar dados do agendamento');
    } finally {
      console.log('🔵 Setando loading para false...');
      setLoading(false);
    }
  };

  const handleBook = async () => {
    console.log('🚀 handleBook chamado. isBookingInProgress:', isBookingInProgress);
    console.log('🚀 Booking:', booking);
    console.log('🚀 User:', !!user);
    console.log('🚀 Service:', !!service);
    console.log('🚀 SelectedDate:', !!selectedDate);
    console.log('🚀 SelectedTime:', !!selectedTime);
    
    // BLOQUEIO PARA EVITAR CHAMADAS MÚLTIPLAS
    if (isBookingInProgress) {
      console.log('🚫 handleBook: Já está em andamento, ignorando chamada');
      return;
    }
    
    if (!user || !service || !selectedDate || !selectedTime || booking) {
        console.log('🚫 handleBook: Condições não atendidas para agendamento.');
        return;
    }
    
    console.log('✅ handleBook: Todas as condições atendidas, iniciando agendamento...');
    console.log('🚀 Setando isBookingInProgress para true...');
    setIsBookingInProgress(true);
    setBooking(true);
    
    try {
      console.log('🚀 Iniciando consulta ao Supabase para agendamento...');
      
      // 1. Verificar se já existe agendamento para este barbeiro no mesmo horário
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('*')
        .eq('barber_id', barberId)
        .eq('appointment_date', selectedDate)
        .eq('status', 'scheduled');

      if (checkError) {
        console.log('🚀 Erro ao verificar agendamentos existentes:', checkError);
        throw checkError;
      }

      // 2. Verificar conflito de horários
      const startMinutes = parseInt(selectedTime.split(':')[0]) * 60 + parseInt(selectedTime.split(':')[1]);
      const endTotal = startMinutes + service.duration_minutes;
      const endTime = `${Math.floor(endTotal / 60).toString().padStart(2, '0')}:${(endTotal % 60).toString().padStart(2, '0')}`;

      const hasConflict = existingAppointments?.some(appointment => {
        const appointmentStart = parseInt(appointment.start_time.split(':')[0]) * 60 + parseInt(appointment.start_time.split(':')[1]);
        const appointmentEnd = parseInt(appointment.end_time.split(':')[0]) * 60 + parseInt(appointment.end_time.split(':')[1]);
        
        // Verifica se há sobreposição de horários
        return (startMinutes < appointmentEnd && endTotal > appointmentStart);
      });

      if (hasConflict) {
        console.log('🚀 Horário já está agendado para este barbeiro');
        toast.error('Este horário já está ocupado. Por favor, escolha outro horário.');
        setBooking(false);
        setIsBookingInProgress(false);
        return;
      }

      console.log('🚀 Horário disponível, prosseguindo com agendamento...');
      
      console.log('🚀 Dados do agendamento:', {
        client_id: user.id,
        barber_id: barberId,
        service_id: serviceId,
        appointment_date: selectedDate,
        start_time: selectedTime,
        end_time: endTime,
        status: 'scheduled'
      });
      
      const { error } = await Promise.race([
        supabase.from('appointments').insert({
          client_id: user.id, 
          barber_id: barberId, 
          service_id: serviceId,
          appointment_date: selectedDate, 
          start_time: selectedTime, 
          end_time: endTime, 
          status: 'scheduled',
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout no agendamento - 60s')), 60000)
        )
      ]);
      
      console.log('🚀 Resultado do insert:', { error });
      
      if (error) {
        console.log('🚀 Erro no agendamento:', error);
        throw error;
      }
      
      console.log('🚀 Agendamento inserido com sucesso!');
      
      // Força a atualização da lista de agendamentos para recalcular os slots
      const newAppointment = {
        client_id: user.id,
        barber_id: barberId,
        service_id: serviceId,
        appointment_date: selectedDate,
        start_time: selectedTime,
        end_time: endTime,
        status: 'scheduled'
      };
      
      // Adiciona o novo agendamento à lista local para atualizar os slots imediatamente
      setAppointments(prev => [...prev, newAppointment]);
      
      // Limpa a seleção para forçar o usuário a escolher novo horário
      setSelectedTime(null);
      
      console.log('🚀 Agendamento adicionado à lista local, slots recalculados');
      console.log('🚀 Navegando para /appointments...');
      toast.success('Agendado com sucesso!');
      navigate('/appointments');
    } catch (e) {
      console.log('🚀 Erro no catch do handleBook:', e);
      toast.error('Erro ao agendar');
      console.log('🚀 Setando booking para false devido ao erro...');
      setBooking(false);
    } finally {
      console.log('🚀 Setando isBookingInProgress para false no finally...');
      setIsBookingInProgress(false);
    }
  };

  const hasAvailableSlots = useMemo(() => (date: Date) => {
    console.log('🔍 Verificando disponibilidade para:', format(date, 'yyyy-MM-dd'));
    
    const schedule = schedules.find(s => s.day_of_week === date.getDay());
    if (!schedule || !service) {
      console.log('🔴 Sem schedule ou service');
      return false;
    }
    
    const start = parseInt(schedule.start_time.split(':')[0]) * 60 + parseInt(schedule.start_time.split(':')[1]);
    const end = parseInt(schedule.end_time.split(':')[0]) * 60 + parseInt(schedule.end_time.split(':')[1]);
    
    // Filtrar agendamentos para este barbeiro nesta data
    const dayApts = appointments.filter(a => 
      a.appointment_date === format(date, 'yyyy-MM-dd') && 
      a.barber_id === barberId &&
      a.status === 'scheduled'
    );
    
    console.log('🔍 Agendamentos do dia:', dayApts.length);
    
    const now = new Date();
    let availableCount = 0;
    
    // Verificar se há algum slot disponível
    for (let t = start; t + service.duration_minutes <= end; t += 30) {
      const hours = Math.floor(t / 60).toString().padStart(2, '0');
      const minutes = (t % 60).toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      
      // Ignorar horários passados se for hoje
      if (isToday(date)) {
        const slotTime = new Date();
        slotTime.setHours(Number(hours), Number(minutes), 0, 0);
        if (slotTime <= now) {
          console.log('🔴 Horário passado:', timeStr);
          continue;
        }
      }

      // Verificar se o horário está ocupado
      const slotEndMinutes = t + service.duration_minutes;
      const isOccupied = dayApts.some(a => {
        const appointmentStart = parseInt(a.start_time.split(':')[0]) * 60 + parseInt(a.start_time.split(':')[1]);
        const appointmentEnd = parseInt(a.end_time.split(':')[0]) * 60 + parseInt(a.end_time.split(':')[1]);
        return (t < appointmentEnd && slotEndMinutes > appointmentStart);
      });
      
      console.log(`🔍 Horário ${timeStr}: ${isOccupied ? 'OCUPADO' : 'DISPONÍVEL'}`);
      
      if (!isOccupied) {
        availableCount++;
      }
    }
    
    console.log(`🔍 Resultado final: ${availableCount} slots disponíveis`);
    return availableCount > 0;
  }, [schedules, service, appointments, barberId]);

  const availableDates: Date[] = [];
  const todayStart = startOfDay(new Date());
  for (let i = 0; i < 30; i++) {
    const d = addDays(todayStart, i);
    if (schedules.some(s => s.day_of_week === d.getDay()) && hasAvailableSlots(d)) {
      availableDates.push(d);
    }
  }

  const slots = useMemo(() => {
    if (!selectedDate) return [];
    
    const schedule = schedules.find(s => s.day_of_week === parseISO(selectedDate).getDay());
    if (!schedule || !service) return [];
    
    const t_slots = [];
    const start = parseInt(schedule.start_time.split(':')[0]) * 60 + parseInt(schedule.start_time.split(':')[1]);
    const end = parseInt(schedule.end_time.split(':')[0]) * 60 + parseInt(schedule.end_time.split(':')[1]);
    
    // Filtrar apenas agendamentos confirmados para este barbeiro nesta data
    const dayApts = appointments.filter(a => 
      a.appointment_date === selectedDate && 
      a.barber_id === barberId &&
      a.status === 'scheduled'
    );
    
    console.log('🔵 Agendamentos do dia:', dayApts);
    
    const now = new Date();

    for (let t = start; t + service.duration_minutes <= end; t += 30) {
      const hours = Math.floor(t / 60).toString().padStart(2, '0');
      const minutes = (t % 60).toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;

      // Ignorar horários passados se for hoje
      if (isToday(parseISO(selectedDate))) {
        const slotTime = new Date();
        slotTime.setHours(Number(hours), Number(minutes), 0, 0);
        if (slotTime <= now) continue;
      }

      // Verificar se o horário está ocupado por algum agendamento existente
      const slotEndMinutes = t + service.duration_minutes;
      const slotEndTime = `${Math.floor(slotEndMinutes / 60).toString().padStart(2, '0')}:${(slotEndMinutes % 60).toString().padStart(2, '0')}`;
      
      const isOccupied = dayApts.some(a => {
        const appointmentStart = parseInt(a.start_time.split(':')[0]) * 60 + parseInt(a.start_time.split(':')[1]);
        const appointmentEnd = parseInt(a.end_time.split(':')[0]) * 60 + parseInt(a.end_time.split(':')[1]);
        
        // Verifica sobreposição: se o slot começa antes do agendamento terminar E termina depois do agendamento começar
        return (t < appointmentEnd && slotEndMinutes > appointmentStart);
      });
      
      console.log(`🔵 Horário ${timeStr} - ${slotEndTime}: ${isOccupied ? 'OCUPADO' : 'DISPONÍVEL'}`);
      
      if (!isOccupied) {
        t_slots.push(timeStr);
      }
    }
    
    console.log('🔵 Slots finais:', t_slots);
    return t_slots;
  }, [selectedDate, schedules, service, appointments, barberId]);

  if (loading) {
    console.log('🔵 Mostrando loading...');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary w-8 h-8 mb-4" />
          <p className="text-muted-foreground">Carregando agendamento...</p>
        </div>
      </div>
    );
  }

  // FALLBACK SE ALGO DER ERRADO
  if (!service || !barberName) {
    console.log('🔵 Dados não carregados, mostrando fallback...');
    console.log('🔵 service:', !!service);
    console.log('🔵 barberName:', !!barberName);
    console.log('🔵 schedules:', schedules.length);
    console.log('🔵 appointments:', appointments.length);
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4">Não foi possível carregar o agendamento</h1>
          <p className="text-muted-foreground mb-4">Verifique se os dados estão corretos</p>
          <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
          <Button variant="outline" onClick={() => navigate('/')} className="ml-2">Voltar para Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden">
      {/* Conteúdo rolável - pb-44 garante que nada fique atrás do botão */}
      <div className="p-5 flex-1 pb-44">
        <header className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft /></Button>
          <h1 className="text-2xl font-bold tracking-tight">Agendar Horário</h1>
        </header>

        <p className="font-semibold mb-4 text-sm uppercase text-muted-foreground tracking-wider">1. Escolha a data</p>
        <div className="mb-8">
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
              return !hasAvailableSlots(date);
            }}
            modifiers={{
              available: (date) => {
                return hasAvailableSlots(date);
              }
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

        {selectedDate && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="font-semibold mb-4 text-sm uppercase text-muted-foreground tracking-wider">2. Escolha o horário</p>
            <div className="grid grid-cols-3 gap-3">
              {slots.map(t => (
                <button 
                  key={t} 
                  onClick={() => setSelectedTime(t)} 
                  className={`py-3 rounded-xl border-2 font-bold transition-all ${selectedTime === t ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card border-border hover:border-primary/50'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            {slots.length === 0 && <p className="text-center text-muted-foreground py-10 bg-muted/30 rounded-xl">Não há horários disponíveis para este dia.</p>}
          </div>
        )}
      </div>

      {/* Botão de Ação Fixo no Rodapé */}
      {selectedTime && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-background border-t-2 border-border z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-full duration-300">
          <Button 
            className="w-full h-14 text-lg font-extrabold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-[0.98]" 
            onClick={() => {
              console.log('🚀 Botão Confirmar Agendamento clicado');
              console.log('🚀 User logado?', !!user);
              console.log('🚀 User ID:', user?.id);
              console.log('🚀 Profile completo:', profile);
              console.log('🚀 Profile phone:', profile?.phone);
              console.log('🚀 Profile phone type:', typeof profile?.phone);
              console.log('🚀 Profile phone length:', profile?.phone?.length);
              console.log('🚀 Profile phone trim:', profile?.phone?.trim());
              console.log('🚀 Profile phone === null:', profile?.phone === null);
              console.log('🚀 Profile phone === undefined:', profile?.phone === undefined);
              console.log('🚀 Profile phone === "":', profile?.phone === '');
              console.log('🚀 !profile?.phone:', !profile?.phone);
              
              // 1. Se não está logado, redireciona para login
              if (!user) {
                console.log('🚀 Usuário não logado, redirecionando para login...');
                toast.error('Faça login para confirmar agendamento');
                navigate('/auth');
                return;
              }
              
              // 2. Se está logado, verifica se tem telefone verificado para agendar
              if (user) {
                console.log('🚀 Usuário logado, verificando telefone...');
                
                // Se não tem telefone ou não está verificado, solicita verificação
                if (!profile?.phone || !(profile.is_verified || profile.phone_verified)) {
                  console.log('🚀 Usuário precisa verificar telefone para agendar...');
                  toast.error('Para confirmar agendamento, precisamos verificar seu WhatsApp.');
                  
                  // Salva a URL atual para retornar após verificação
                  sessionStorage.setItem('returnToBooking', location.pathname);
                  navigate('/verify-phone');
                  return;
                }
                
                // 3. Se está tudo ok, confirma agendamento
                console.log('🚀 Telefone verificado, confirmando agendamento...');
                handleBook();
              }
            }}
            disabled={booking}
          >
            {booking ? <Loader2 className="animate-spin mr-2" /> : 'Confirmar Agendamento'}
          </Button>
        </div>
      )}
    </div>
  );
}
