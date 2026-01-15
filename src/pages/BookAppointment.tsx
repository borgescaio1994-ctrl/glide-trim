import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
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
  break_start?: string;
  break_end?: string;
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
  const [confirming, setConfirming] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');

  // Phone verification states
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const fetchAppointments = async () => {
    try {
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
      console.error('Error fetching appointments:', error);
    }
  };

  useEffect(() => {
    if (barberId && serviceId) {
      fetchData();
    }
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
      }, () => {
        fetchAppointments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barberId]);

  const fetchData = async () => {
    try {
      const { data: serviceData } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (serviceData) {
        setService(serviceData);
      }

      const { data: barberData } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', barberId)
        .single();

      if (barberData) {
        setBarberName(barberData.full_name);
      }

      const { data: schedulesData } = await supabase
        .from('barber_schedules')
        .select('*')
        .eq('barber_id', barberId)
        .eq('is_active', true);

      if (schedulesData) {
        setSchedules(schedulesData);
      }

      await fetchAppointments();
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

    const dayAppointments = appointments.filter((a) => a.appointment_date === dateStr);

    for (let time = startMinutes; time + service.duration_minutes <= endMinutes; time += 30) {
      const hours = Math.floor(time / 60);
      const mins = time % 60;
      const slotStart = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      const slotEndTime = time + service.duration_minutes;
      const slotEnd = `${Math.floor(slotEndTime / 60).toString().padStart(2, '0')}:${(slotEndTime % 60).toString().padStart(2, '0')}`;

      const hasConflict = dayAppointments.some((apt) => {
        const aptStart = apt.start_time.slice(0, 5);
        const aptEnd = apt.end_time.slice(0, 5);
        return (slotStart < aptEnd && slotEnd > aptStart);
      });

      const now = new Date();
      const slotDate = parseISO(dateStr);
      slotDate.setHours(hours, mins, 0, 0);
      const isInPast = isBefore(slotDate, now);

      let overlapsBreak = false;
      if (schedule.break_start && schedule.break_end) {
        const breakStart = schedule.break_start.slice(0, 5);
        const breakEnd = schedule.break_end.slice(0, 5);
        if (slotStart < breakEnd && slotEnd > breakStart) {
          overlapsBreak = true;
        }
      }

      if (!hasConflict && !isInPast && !overlapsBreak) {
        slots.push(slotStart);
      }
    }

    return slots;
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    
    if (digits.length <= 2) {
      return `(${digits}`;
    } else if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 11) {
      setPhoneNumber(formatted);
    }
  };

  const handleSendCode = async () => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      toast.error('Digite um número de telefone válido');
      return;
    }

    setVerifyingPhone(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-verification', {
        body: { phone: digits }
      });

      if (error) {
        console.error('Error sending verification:', error);
        toast.error('Erro ao enviar código. Tente novamente.');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setCodeSent(true);
      toast.success('Código enviado via WhatsApp!');
    } catch (error) {
      console.error('Error sending verification:', error);
      toast.error('Erro ao enviar código. Tente novamente.');
    } finally {
      setVerifyingPhone(false);
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
        body: { 
          phone: phoneNumber.replace(/\D/g, ''),
          code: verificationCode 
        }
      });

      if (error) {
        console.error('Error verifying code:', error);
        toast.error('Erro ao verificar código');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.verified) {
        toast.success('Número verificado com sucesso!');
        
        // Update profile with phone number if user is logged in
        if (user && profile?.id) {
          await supabase
            .from('profiles')
            .update({ phone: phoneNumber.replace(/\D/g, '') })
            .eq('id', profile.id);
        }
        
        setShowPhoneVerification(false);
        
        // Now proceed to book
        handleBook();
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      toast.error('Erro ao verificar código');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleConfirmClick = () => {
    if (confirming) return;

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
    if (!profile?.id || !service || !selectedDate || !selectedTime) return;

    setBooking(true);

    try {
      if (!profile?.phone && phoneInput) {
        const { error: phoneError } = await supabase
          .from('profiles')
          .update({ phone: phoneInput.replace(/\D/g, '') })
          .eq('id', profile.id);

        if (phoneError) throw phoneError;
      }

      const startMinutes = parseInt(selectedTime.split(':')[0]) * 60 + parseInt(selectedTime.split(':')[1]);
      const endMinutes = startMinutes + service.duration_minutes;
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

      const { data: existingAppointment } = await supabase
        .from('appointments')
        .select('id')
        .eq('barber_id', barberId)
        .eq('appointment_date', selectedDate)
        .eq('start_time', selectedTime)
        .eq('status', 'scheduled')
        .single();

      if (existingAppointment) {
        toast.error('Este horário já foi agendado. Por favor, escolha outro horário.');
        return;
      }

      const { data, error } = await supabase.from('appointments').insert({
        client_id: profile.id,
        barber_id: barberId,
        service_id: serviceId,
        appointment_date: selectedDate,
        start_time: selectedTime,
        end_time: endTime,
        status: 'scheduled',
      }).select('id').single();

      if (error) throw error;

      try {
        const { data: clientProfile } = await (supabase
          .from('profiles')
          .select('fcm_token')
          .eq('id', profile.id)
          .single() as any);

        if (clientProfile?.fcm_token) {
          const { error } = await supabase.functions.invoke('send-push-notification', {
            body: {
              token: clientProfile.fcm_token,
              title: 'Agendamento Confirmado',
              body: `Seu agendamento para ${service.name} foi confirmado.`,
              data: {
                appointment_id: data.id,
                type: 'appointment_confirmed'
              }
            }
          });
          if (!error) {
            toast.success('Agendamento realizado com sucesso! Notificação push enviada.');
          } else {
            toast.success('Agendamento realizado com sucesso!');
          }
        } else {
          toast.success('Agendamento realizado com sucesso!');
        }
      } catch (error) {
        console.error('Error sending push notification:', error);
        toast.success('Agendamento realizado com sucesso!');
      }

      navigate('/appointments');
    } catch (error) {
      console.error('Error booking:', error);
      toast.error('Erro ao realizar agendamento');
    } finally {
      setBooking(false);
      setConfirming(false);
    }
  };

  const completeBooking = async (verifiedPhone: string, userId: string) => {
    if (!service || !selectedDate || !selectedTime || !barberId || !serviceId) return;

    setBooking(true);

    try {
      const startMinutes = parseInt(selectedTime.split(':')[0]) * 60 + parseInt(selectedTime.split(':')[1]);
      const endMinutes = startMinutes + service.duration_minutes;
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

      const { data: existingAppointment } = await supabase
        .from('appointments')
        .select('id')
        .eq('barber_id', barberId)
        .eq('appointment_date', selectedDate)
        .eq('start_time', selectedTime)
        .eq('status', 'scheduled')
        .single();

      if (existingAppointment) {
        toast.error('Este horário já foi agendado. Por favor, escolha outro horário.');
        return;
      }

      const { data, error } = await supabase.from('appointments').insert({
        client_id: userId,
        barber_id: barberId,
        service_id: serviceId,
        appointment_date: selectedDate,
        start_time: selectedTime,
        end_time: endTime,
        status: 'scheduled',
      }).select('id').single();

      if (error) throw error;

      toast.success('Agendamento confirmado! Você receberá uma confirmação no WhatsApp.');

      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: 'Agendamento Confirmado!',
              body: `Seu agendamento foi confirmado.`,
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 1000) },
            },
          ],
        });
      }

      navigate('/');
    } catch (error) {
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

  // Phone verification modal
  if (showPhoneVerification && user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="px-5 pt-12 pb-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => {
                setShowPhoneVerification(false);
                setCodeSent(false);
                setVerificationCode('');
              }}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-2xl font-bold text-foreground">Confirmar Agendamento</h1>
          </div>
        </header>

        <div className="px-5">
          {service && (
            <div className="bg-card rounded-2xl p-4 border border-border/50 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Scissors className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-foreground">{service.name}</h2>
                  <p className="text-sm text-muted-foreground">com {barberName}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {selectedDate && format(parseISO(selectedDate), "d 'de' MMM", { locale: ptBR })}
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

          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {codeSent ? 'Digite o código' : 'Verificar WhatsApp'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {codeSent 
                  ? 'Insira o código de 6 dígitos enviado para seu WhatsApp'
                  : 'Digite seu número do WhatsApp para receber confirmações e lembretes'
                }
              </p>
            </div>

            {!codeSent ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Número do WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      className="pl-10 h-12 text-lg"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSendCode}
                  disabled={verifyingPhone || phoneNumber.replace(/\D/g, '').length < 10}
                  className="w-full h-12"
                >
                  {verifyingPhone ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Enviar código
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Código de verificação</label>
                  <Input
                    type="text"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-12 text-lg text-center tracking-widest font-mono"
                    maxLength={6}
                  />
                </div>

                <Button
                  onClick={handleVerifyCode}
                  disabled={verifyingCode || verificationCode.length !== 6}
                  className="w-full h-12"
                >
                  {verifyingCode ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Verificar e agendar
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => {
                    setCodeSent(false);
                    setVerificationCode('');
                  }}
                  variant="ghost"
                  className="w-full"
                >
                  Enviar novo código
                </Button>
              </>
            )}

            <Button
              onClick={() => setShowPhoneVerification(false)}
              variant="outline"
              className="w-full h-12"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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

          {user && profile?.id && !profile?.phone && (
            <div className="bg-card rounded-2xl p-4 border border-border/50 mb-4">
              <h3 className="font-medium text-foreground mb-2">Número do WhatsApp</h3>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(formatPhoneNumber(e.target.value))}
                  className="pl-10 h-12"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Este número será usado para confirmações e lembretes
              </p>
            </div>
          )}

          <Button
            onClick={handleConfirmClick}
            disabled={booking || confirming || (user && profile?.id && !profile?.phone && phoneInput.replace(/\D/g, '').length < 10)}
            className="w-full h-12 bg-primary hover:bg-primary/90"
          >
            {booking || confirming ? (
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
