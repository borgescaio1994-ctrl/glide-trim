import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format, addDays, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Calendar, Clock, DollarSign, Scissors, Check, Loader2, Phone, MessageCircle } from 'lucide-react';

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
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [service, setService] = useState<Service | null>(null);
  const [barberName, setBarberName] = useState('');
  const [schedules, setSchedules] = useState<BarberSchedule[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  // Verificação WhatsApp
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    if (barberId && serviceId) fetchData();
  }, [barberId, serviceId]);

  useEffect(() => {
    if (!barberId) return;
    const channel = supabase
      .channel('appointments_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'appointments',
        filter: `barber_id=eq.${barberId}`,
      }, () => fetchAppointments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [barberId]);

  const fetchData = async () => {
    try {
      const [serviceRes, barberRes, schedulesRes] = await Promise.all([
        supabase.from('services').select('*').eq('id', serviceId).single(),
        supabase.from('profiles').select('full_name').eq('id', barberId).single(),
        supabase.from('barber_schedules').select('*').eq('barber_id', barberId).eq('is_active', true)
      ]);
      
      if (serviceRes.data) setService(serviceRes.data);
      if (barberRes.data) setBarberName(barberRes.data.full_name);
      if (schedulesRes.data) setSchedules(schedulesRes.data);
      
      await fetchAppointments();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    const startDate = format(new Date(), 'yyyy-MM-dd');
    const endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('appointments')
      .select('appointment_date, start_time, end_time')
      .eq('barber_id', barberId)
      .eq('status', 'scheduled')
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate);
    if (data) setAppointments(data);
  };

  const getAvailableDates = () => {
    const dates: Date[] = [];
    const today = startOfDay(new Date());
    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      if (schedules.some(s => s.day_of_week === date.getDay())) dates.push(date);
    }
    return dates;
  };

  const getAvailableTimeSlots = (dateStr: string) => {
    if (!service) return [];
    const date = parseISO(dateStr);
    const schedule = schedules.find(s => s.day_of_week === date.getDay());
    if (!schedule) return [];

    const slots: string[] = [];
    const [startH, startM] = schedule.start_time.split(':').map(Number);
    const [endH, endM] = schedule.end_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const dayAppointments = appointments.filter(a => a.appointment_date === dateStr);

    for (let time = startMinutes; time + service.duration_minutes <= endMinutes; time += 30) {
      const hours = Math.floor(time / 60);
      const mins = time % 60;
      const slotStart = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      const slotEndTime = time + service.duration_minutes;
      const slotEnd = `${Math.floor(slotEndTime / 60).toString().padStart(2, '0')}:${(slotEndTime % 60).toString().padStart(2, '0')}`;

      const hasConflict = dayAppointments.some(apt => {
        const aptStart = apt.start_time.slice(0, 5);
        const aptEnd = apt.end_time.slice(0, 5);
        return slotStart < aptEnd && slotEnd > aptStart;
      });

      const slotDate = parseISO(dateStr);
      slotDate.setHours(hours, mins, 0, 0);
      
      if (!hasConflict && !isBefore(slotDate, new Date())) slots.push(slotStart);
    }
    return slots;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleSendCode = async () => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      toast.error('Digite um número válido');
      return;
    }
    setSendingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-verification', {
        body: { phone: digits }
      });
      if (error || data?.error) {
        toast.error(data?.error || 'Erro ao enviar código');
        return;
      }
      setCodeSent(true);
      toast.success('Código enviado via WhatsApp!');
    } catch {
      toast.error('Erro ao enviar código');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }
    setVerifyingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-phone-code', {
        body: { phone: phoneNumber.replace(/\D/g, ''), code: verificationCode }
      });
      if (error || data?.error) {
        toast.error(data?.error || 'Código inválido');
        return;
      }
      if (data?.verified) {
        toast.success('Número verificado!');
        if (user && profile?.id) {
          await supabase.from('profiles').update({ phone: phoneNumber.replace(/\D/g, '') }).eq('id', profile.id);
        }
        setShowPhoneVerification(false);
        await handleBook();
      }
    } catch {
      toast.error('Erro ao verificar código');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleConfirmClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!profile?.phone) {
      setShowPhoneVerification(true);
    } else {
      handleBook();
    }
  };

  const handleBook = async () => {
    if (!profile?.id || !service || !selectedDate || !selectedTime || !barberId) return;
    setBooking(true);
    try {
      const startMinutes = parseInt(selectedTime.split(':')[0]) * 60 + parseInt(selectedTime.split(':')[1]);
      const endMinutes = startMinutes + service.duration_minutes;
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

      // Verificar conflito
      const { data: existing } = await supabase
        .from('appointments')
        .select('id')
        .eq('barber_id', barberId)
        .eq('appointment_date', selectedDate)
        .eq('start_time', selectedTime)
        .eq('status', 'scheduled')
        .single();

      if (existing) {
        toast.error('Horário já agendado. Escolha outro.');
        return;
      }

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
      toast.success('Agendamento realizado!');
      navigate('/appointments');
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Erro ao agendar');
    } finally {
      setBooking(false);
    }
  };

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  const availableDates = getAvailableDates();
  const availableTimeSlots = selectedDate ? getAvailableTimeSlots(selectedDate) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Modal de verificação WhatsApp
  if (showPhoneVerification && user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="px-5 pt-12 pb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setShowPhoneVerification(false); setCodeSent(false); setVerificationCode(''); }}
              className="p-2 hover:bg-muted rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-2xl font-bold text-foreground">Verificar WhatsApp</h1>
          </div>
        </header>

        <div className="px-5 space-y-6">
          {service && (
            <div className="bg-card rounded-2xl p-4 border border-border/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Scissors className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{service.name}</h2>
                  <p className="text-sm text-muted-foreground">com {barberName}</p>
                  <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {selectedDate && format(parseISO(selectedDate), "d MMM", { locale: ptBR })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {codeSent ? 'Digite o código' : 'Verificar número'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {codeSent ? 'Código de 6 dígitos enviado para seu WhatsApp' : 'Digite seu WhatsApp para confirmações'}
            </p>
          </div>

          {!codeSent ? (
            <div className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(formatPhone(e.target.value))}
                  className="pl-10 h-12 text-lg"
                  maxLength={15}
                />
              </div>
              <Button onClick={handleSendCode} disabled={sendingCode} className="w-full h-12">
                {sendingCode ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar código'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-12 text-lg text-center tracking-widest font-mono"
                maxLength={6}
              />
              <Button onClick={handleVerifyCode} disabled={verifyingCode} className="w-full h-12">
                {verifyingCode ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar e agendar'}
              </Button>
              <Button onClick={() => { setCodeSent(false); setVerificationCode(''); }} variant="ghost" className="w-full">
                Reenviar código
              </Button>
            </div>
          )}

          <Button onClick={() => setShowPhoneVerification(false)} variant="outline" className="w-full h-12">
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="px-5 pt-12 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Agendar</h1>
        </div>

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
                onClick={() => { setSelectedDate(dateStr); setSelectedTime(null); }}
                className={`flex-shrink-0 w-16 py-3 rounded-xl text-center transition-all ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground hover:border-primary'
                }`}
              >
                <p className="text-xs uppercase">{format(date, 'EEE', { locale: ptBR })}</p>
                <p className="text-lg font-semibold">{format(date, 'd')}</p>
                <p className="text-xs">{format(date, 'MMM', { locale: ptBR })}</p>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="px-5 mb-6 animate-fade-in">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Escolha um horário
          </h3>
          {availableTimeSlots.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Nenhum horário disponível</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {availableTimeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    selectedTime === time ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground hover:border-primary'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedDate && selectedTime && (
        <div className="px-5 pb-8 animate-fade-in">
          <div className="bg-card rounded-2xl p-4 border border-border/50 mb-4">
            <h3 className="font-medium text-foreground mb-2">Resumo</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{format(parseISO(selectedDate), "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Clock className="w-4 h-4" />
              <span>{selectedTime}</span>
            </div>
          </div>

          <Button onClick={handleConfirmClick} disabled={booking} className="w-full h-12">
            {booking ? <Loader2 className="w-5 h-5 animate-spin" /> : (
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
