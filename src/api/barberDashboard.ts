import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types/auth';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface BarberAppointment {
  id: string;
  client_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  client?: { full_name: string };
  service?: { name: string; price: number; duration_minutes: number };
}

export interface BarberStats {
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  todayAppointments: number;
}

export async function fetchBarberHomeTitle(establishmentId: string | null): Promise<{ title: string } | null> {
  if (!establishmentId) return null;
  const { data } = await supabase
    .from('establishments')
    .select('name, home_title')
    .eq('id', establishmentId)
    .maybeSingle();
  if (!data) return null;
  return {
    title: ((data as { home_title?: string | null }).home_title ?? data.name ?? 'BookNow') as string,
  };
}

export async function fetchBarberDayAppointments(
  profile: Profile,
  selectedDate: Date
): Promise<BarberAppointment[]> {
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { data } = await supabase
    .from('appointments')
    .select(
      `
        *,
        client:profiles!appointments_client_id_fkey(full_name),
        service:services(name, price, duration_minutes)
      `
    )
    .eq('barber_id', profile.id)
    .eq('appointment_date', dateStr)
    .order('start_time', { ascending: true });

  return (data ?? []) as BarberAppointment[];
}

export async function fetchBarberStats(profile: Profile): Promise<BarberStats> {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const { data: todayAppts } = await supabase
    .from('appointments')
    .select('id')
    .eq('barber_id', profile.id)
    .eq('appointment_date', todayStr)
    .eq('status', 'scheduled');

  const { data: todayData } = await supabase
    .from('appointments')
    .select('service:services(price)')
    .eq('barber_id', profile.id)
    .gte('completed_at', startOfDay(today).toISOString())
    .lt('completed_at', endOfDay(today).toISOString())
    .eq('status', 'completed');

  const { data: weekData } = await supabase
    .from('appointments')
    .select('service:services(price)')
    .eq('barber_id', profile.id)
    .gte('completed_at', startOfWeek(today, { locale: ptBR }).toISOString())
    .lt('completed_at', endOfWeek(today, { locale: ptBR }).toISOString())
    .eq('status', 'completed');

  const { data: monthData } = await supabase
    .from('appointments')
    .select('service:services(price)')
    .eq('barber_id', profile.id)
    .gte('completed_at', startOfMonth(today).toISOString())
    .lt('completed_at', endOfMonth(today).toISOString())
    .eq('status', 'completed');

  const sumPrices = (rows: { service?: { price?: number } | null }[]) =>
    rows?.reduce((sum, item) => sum + (Number(item.service?.price) || 0), 0) || 0;

  return {
    todayAppointments: todayAppts?.length || 0,
    todayEarnings: sumPrices((todayData || []) as { service?: { price?: number } }[]),
    weekEarnings: sumPrices((weekData || []) as { service?: { price?: number } }[]),
    monthEarnings: sumPrices((monthData || []) as { service?: { price?: number } }[]),
  };
}
