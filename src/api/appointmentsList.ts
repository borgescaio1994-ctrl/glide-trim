import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types/auth';

export type AppointmentRow = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  barber?: { full_name: string };
  client?: { full_name: string };
  service?: { name: string; price: number; duration_minutes: number; image_url: string | null };
};

export async function fetchAppointmentsForProfile(profile: Profile): Promise<AppointmentRow[]> {
  try {
    await supabase.rpc('auto_cancel_past_appointments');
  } catch {
    try {
      await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('status', 'scheduled')
        .lt('appointment_date', new Date().toISOString().split('T')[0]);
    } catch {
      /* RPC pode não existir */
    }
  }

  const isBarberView =
    profile.profile_role === 'BARBER' || profile.profile_role === 'ADMIN_BARBER';
  const column = isBarberView ? 'barber_id' : 'client_id';
  const { data, error } = await supabase
    .from('appointments')
    .select(
      `
        *,
        barber:profiles!appointments_barber_id_fkey(full_name),
        client:profiles!appointments_client_id_fkey(full_name),
        service:services(name, price, duration_minutes, image_url)
      `
    )
    .eq(column, profile.id)
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AppointmentRow[];
}
