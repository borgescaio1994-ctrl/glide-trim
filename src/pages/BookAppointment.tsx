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

    const fullPhoneNumber = digits.startsWith('55') ? digits : `55${digits}`;
    setVerifyingPhone(true);

    try {
      // 1. Gerar código de 6 dígitos
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

      // 2. Salvar na tabela phone_verifications do Supabase
      const { error: dbError } = await supabase.from('phone_verifications').insert({
        phone_number: digits,
        token: generatedCode,
        expires_at: new Date(Date.now() + 10 * 60000).toISOString() // 10 min
      });

      if (dbError) throw dbError;

      // 3. Enviar para o Webhook do n8n
      const webhookUrl = 'https://primary-jzx9-production.up.railway.app/webhook/enviar-codigo'; // ATENÇÃO: COLOQUE SUA URL DE PRODUÇÃO DO N8N AQUI

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: fullPhoneNumber,
          code: generatedCode
        })
      });

      if (!response.ok) throw new Error('Falha ao enviar via n8n');

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
      // Buscar o código no banco
      const { data, error } = await supabase
        .from('phone_verifications')
        .select('*')
        .eq('phone_number', phoneNumber.replace(/\D/g, ''))
        .eq('token', verificationCode)
        .is('verified_at', null)
        .single();

      if (error || !data) {
        toast.error('Código inválido ou expirado');
        return;
      }

      // Marcar como verificado
      await supabase
        .from('phone_verifications')
        .update({ verified_at: new Date().toISOString() })
        .eq('id', data.id);

      toast.success('Número verificado com sucesso!');
      
      if (user && profile?.id) {
        await supabase
          .from('profiles')
          .update({ phone: phoneNumber.replace(/\D/g, '') })
          .eq('id', profile.id);
      }
      
      setShowPhoneVerification(false);
      handleBook();
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
        toast.error('Este horário já foi agendado.');
        return;
      }

      await supabase.from('appointments').insert({
        client_id: profile.id,
        barber_id: barberId,
        service_id: serviceId,
        appointment_date: selectedDate,
        start_time: selectedTime,
        end_time: endTime,
        status: 'scheduled',
      });

      toast.success('Agendamento realizado com sucesso!');
      navigate('/appointments');
    } catch (error) {
      console.error('Error booking:', error);
      toast.error('Erro ao realizar agendamento');
    } finally {
      setBooking(false);
      setConfirming(false);
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
                  ? 'Insira o código enviado para seu WhatsApp'
                  : 'Digite seu WhatsApp para receber a confirmação'
                }
              </p>
            </div>

            {!codeSent ? (
              <>
                <div className="space-y-2">
                  <Input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    className="h-12 text-lg text-center"
                  />
                </div>
                <Button
                  onClick={handleSendCode}
                  disabled={verifyingPhone || phoneNumber.replace(/\D/g, '').length < 10}
                  className="w-full h-12"
                >
                  {verifyingPhone ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar código'}
                </Button>
              </>
            ) : (
              <>
                <Input
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-12 text-lg text-center tracking-widest font-mono"
                  maxLength={6}
                />
                <Button
                  onClick={handleVerifyCode}
                  disabled={verifyingCode || verificationCode.length !== 6}
                  className="w-full h-12"
                >
                  {verifyingCode ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar e agendar'}
                </Button>
              </>
            )}
          </div>
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
            <h2 className="font-semibold">{service.name}</h2>
            <p className="text-sm text-muted-foreground">{barberName} • {formatPrice(Number(service.price))}</p>
          </div>
        )}
      </header>

      <div className="px-5 mb-6">
        <div className="flex gap-2 overflow-x-auto">
          {availableDates.map((date) => (
            <button
              key={format(date, 'yyyy-MM-dd')}
              onClick={() => setSelectedDate(format(date, 'yyyy-MM-dd'))}
              className={`flex-shrink-0 w-16 py-3 rounded-xl border ${selectedDate === format(date, 'yyyy-MM-dd') ? 'bg-primary text-white' : 'bg-card'}`}
            >
              <span className="text-xs">{format(date, 'EEE', { locale: ptBR })}</span>
              <p className="font-bold">{format(date, 'd')}</p>
            </button>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div className="px-5 grid grid-cols-4 gap-2">
          {availableTimeSlots.map((time) => (
            <button
              key={time}
              onClick={() => setSelectedTime(time)}
              className={`py-2 rounded-lg border ${selectedTime === time ? 'bg-primary text-white' : 'bg-card'}`}
            >
              {time}
            </button>
          ))}
        </div>
      )}

      {selectedDate && selectedTime && (
        <div className="p-5">
          <Button onClick={handleConfirmClick} disabled={booking} className="w-full h-12">
            {booking ? <Loader2 className="animate-spin" /> : 'Confirmar Agendamento'}
          </Button>
        </div>
      )}
    </div>
  );
}