import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface DailyStats {
  date: string;
  earnings: number;
  count: number;
}

export interface FinancesStatsResult {
  total: number;
  count: number;
  average: number;
  dailyStats: DailyStats[];
}

export async function fetchFinancesStats(
  barberId: string,
  period: 'week' | 'month'
): Promise<FinancesStatsResult> {
  const today = new Date();
  let startDate: Date;
  let endDate: Date;

  if (period === 'week') {
    startDate = startOfWeek(today, { locale: ptBR });
    endDate = endOfWeek(today, { locale: ptBR });
  } else {
    startDate = startOfMonth(today);
    endDate = endOfMonth(today);
  }

  const { data } = await supabase
    .from('appointments')
    .select('appointment_date, service:services(price)')
    .eq('barber_id', barberId)
    .eq('status', 'completed')
    .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
    .lte('appointment_date', format(endDate, 'yyyy-MM-dd'));

  if (!data) {
    return { total: 0, count: 0, average: 0, dailyStats: [] };
  }

  const totalEarnings = data.reduce(
    (sum, item) => sum + (Number((item.service as { price?: number })?.price) || 0),
    0
  );

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const dailyStats = days.map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayAppointments = data.filter((a) => a.appointment_date === dateStr);
    const dayEarnings = dayAppointments.reduce(
      (sum, item) => sum + (Number((item.service as { price?: number })?.price) || 0),
      0
    );
    return {
      date: dateStr,
      earnings: dayEarnings,
      count: dayAppointments.length,
    };
  });

  return {
    total: totalEarnings,
    count: data.length,
    average: data.length > 0 ? totalEarnings / data.length : 0,
    dailyStats,
  };
}
