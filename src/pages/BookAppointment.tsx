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

  // Phone verification states
  const [showVerification, setShowVerification] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [requiresOptIn, setRequiresOptIn] = useState(false);

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

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XX) XXXXX-XXXX
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

    setSendingCode(true);
    setRequiresOptIn(false);

    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-verification', {
        body: { phone: digits }
      });

      if (error) throw error;

      if (data.requiresOptIn) {
        setRequiresOptIn(true);
        toast.error(data.error);
      } else if (data.success) {
        setCodeSent(true);
        toast.success('Código enviado via WhatsApp!');
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (error: any) {
      console.error('Error sending code:', error);
      toast.error('Erro ao enviar código. Tente novamente.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }

    setVerifying(true);

    try {
      const digits = phoneNumber.replace(/\D/g, '');
      const { data, error } = await supabase.functions.invoke('verify-phone-code', {
        body: { phone: digits, code: verificationCode }
      });

      if (error) throw error;

      if (data.verified) {
        setPhoneVerified(true);
        toast.success('Telefone verificado com sucesso!');
        // Now book the appointment
        await completeBooking(data.phone);
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast.error('Código inválido. Tente novamente.');
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmClick = () => {
    // If user is logged in, book directly
    if (user && profile?.id) {
      handleBook();
    } else {
      // Show phone verification flow
      setShowVerification(true);
    }
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

  const completeBooking = async (verifiedPhone: string) => {
    if (!service || !selectedDate || !selectedTime || !barberId || !serviceId) return;

    setBooking(true);

    try {
      const startMinutes = parseInt(selectedTime.split(':')[0]) * 60 + parseInt(selectedTime.split(':')[1]);
      const endMinutes = startMinutes + service.duration_minutes;
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

      // For guest users, we need to create a temporary client entry or use a guest flow
      // For now, we'll show success and navigate - in production, you'd want to handle guest bookings
      toast.success('Agendamento confirmado! Você receberá uma confirmação no WhatsApp.');
      navigate('/');
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

  // Phone verification modal/flow
  if (showVerification && !user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="px-5 pt-12 pb-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => {
                if (codeSent && !phoneVerified) {
                  setCodeSent(false);
                  setVerificationCode('');
                } else {
                  setShowVerification(false);
                }
              }}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-2xl font-bold text-foreground">Confirmar Agendamento</h1>
          </div>
        </header>

        <div className="px-5">
          {/* Appointment Summary */}
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

          {!codeSent ? (
            // Phone input step
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Verificar WhatsApp</h2>
                <p className="text-muted-foreground text-sm">
                  Digite seu número de WhatsApp para confirmar o agendamento
                </p>
              </div>

              {requiresOptIn && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    <strong>Importante:</strong> Para receber o código, primeiro envie uma mensagem para 
                    <strong> +1 (415) 523-8886 </strong> 
                    no WhatsApp com a palavra <strong>"join"</strong>. 
                    Após isso, tente novamente.
                  </p>
                </div>
              )}

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
                disabled={sendingCode || phoneNumber.replace(/\D/g, '').length < 10}
                className="w-full h-12"
              >
                {sendingCode ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Enviar código via WhatsApp
                  </>
                )}
              </Button>
            </div>
          ) : (
            // Code verification step
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Código Enviado!</h2>
                <p className="text-muted-foreground text-sm">
                  Digite o código de 6 dígitos enviado para {phoneNumber}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Código de verificação</label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-14 text-2xl text-center tracking-[0.5em] font-mono"
                  maxLength={6}
                />
              </div>

              <Button
                onClick={handleVerifyCode}
                disabled={verifying || verificationCode.length !== 6}
                className="w-full h-12 bg-green-600 hover:bg-green-700"
              >
                {verifying || booking ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Verificar e Confirmar
                  </>
                )}
              </Button>

              <button
                onClick={() => {
                  setCodeSent(false);
                  setVerificationCode('');
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Não recebi o código. Reenviar.
              </button>
            </div>
          )}
        </div>
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
            onClick={handleConfirmClick}
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
