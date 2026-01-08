import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

interface ScheduleDay {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start?: string;
  break_end?: string;
  is_active: boolean;
}

export default function Schedule() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<ScheduleDay[]>(
    DAYS_OF_WEEK.map((day) => ({
      day_of_week: day.value,
      start_time: '09:00',
      end_time: '18:00',
      break_start: '',
      break_end: '',
      is_active: false,
    }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('Schedule component re-rendered');
  });

  useEffect(() => {
    console.log('Schedule useEffect triggered, profile.id:', profile?.id);
    if (profile?.id) {
      fetchSchedules();
    }
  }, [profile?.id]);

  const fetchSchedules = async () => {
    console.log('fetchSchedules called for barber_id:', profile?.id);
    if (!profile?.id) return;

    const startTime = Date.now();
    const { data, error } = await supabase
      .from('barber_schedules')
      .select('*')
      .eq('barber_id', profile.id);
    const endTime = Date.now();
    console.log('Supabase query took:', endTime - startTime, 'ms');

    if (data) {
      console.log('Fetched schedules data:', data);
      const updatedSchedules = DAYS_OF_WEEK.map((day) => {
        const existing = data.find((s) => s.day_of_week === day.value);
        if (existing) {
          return {
            id: existing.id,
            day_of_week: existing.day_of_week,
            start_time: existing.start_time.slice(0, 5),
            end_time: existing.end_time.slice(0, 5),
            break_start: (existing as any).break_start?.slice(0, 5) || '',
            break_end: (existing as any).break_end?.slice(0, 5) || '',
            is_active: existing.is_active,
          };
        }
        return {
          day_of_week: day.value,
          start_time: '09:00',
          end_time: '18:00',
          break_start: '',
          break_end: '',
          is_active: false,
        };
      });
      setSchedules(updatedSchedules);
    } else if (error) {
      console.error('Error fetching schedules:', error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    setSaving(true);

    try {
      const activeSchedules = schedules.filter((s) => s.is_active);

      // Delete all existing schedules
      await supabase
        .from('barber_schedules')
        .delete()
        .eq('barber_id', profile.id);

      // Insert new schedules
      if (activeSchedules.length > 0) {
        const { error } = await supabase.from('barber_schedules').insert(
          activeSchedules.map((s) => ({
            barber_id: profile.id,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            break_start: s.break_start || null,
            break_end: s.break_end || null,
            is_active: s.is_active,
          }))
        );

        if (error) throw error;
      }

      toast.success('Horários salvos com sucesso!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateSchedule = (dayIndex: number, field: keyof ScheduleDay, value: any) => {
    setSchedules((prev) =>
      prev.map((s, i) => (i === dayIndex ? { ...s, [field]: value } : s))
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-12 pb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Horários de Trabalho</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Configure os dias e horários em que você atende
        </p>
      </header>

      {/* Schedule List */}
      <div className="px-5 pb-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="bg-card rounded-xl p-4 animate-pulse border border-border/50">
                <div className="h-5 bg-muted rounded w-24 mb-2" />
                <div className="h-4 bg-muted rounded w-32" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule, index) => (
              <div
                key={schedule.day_of_week}
                className={`bg-card rounded-xl p-4 border transition-all ${
                  schedule.is_active ? 'border-primary/50' : 'border-border/50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      schedule.is_active ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      <Clock className={`w-5 h-5 ${schedule.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span className="font-medium text-foreground">
                      {DAYS_OF_WEEK[schedule.day_of_week].label}
                    </span>
                  </div>
                  <Switch
                    checked={schedule.is_active}
                    onCheckedChange={(checked) => updateSchedule(index, 'is_active', checked)}
                  />
                </div>

                {schedule.is_active && (
                  <div className="space-y-3 mt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Início</Label>
                        <Input
                          type="time"
                          value={schedule.start_time}
                          onChange={(e) => updateSchedule(index, 'start_time', e.target.value)}
                          className="mt-1 bg-input border-border text-sm h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Fim</Label>
                        <Input
                          type="time"
                          value={schedule.end_time}
                          onChange={(e) => updateSchedule(index, 'end_time', e.target.value)}
                          className="mt-1 bg-input border-border text-sm h-10"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Pausa Início (opcional)</Label>
                        <Input
                          type="time"
                          value={schedule.break_start}
                          onChange={(e) => updateSchedule(index, 'break_start', e.target.value)}
                          className="mt-1 bg-input border-border text-sm h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Pausa Fim (opcional)</Label>
                        <Input
                          type="time"
                          value={schedule.break_end}
                          onChange={(e) => updateSchedule(index, 'break_end', e.target.value)}
                          className="mt-1 bg-input border-border text-sm h-10"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Salvar horários'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
