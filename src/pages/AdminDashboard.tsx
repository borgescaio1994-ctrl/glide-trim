import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { deleteUserFromAuth } from '@/lib/authAdmin';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Users,
  Scissors,
  Trash2,
  PieChart,
  BarChart3,
  AlertCircle,
  Settings,
  UserPlus,
  X,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/contexts/ToastContext';
import { SimpleModal } from '@/components/ui/SimpleModal';
import HomeSettingsEditor from '@/components/admin/HomeSettingsEditor';
import { messageFromFunctionsInvoke } from '@/lib/edgeFunctionError';

interface Barber {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

interface RegisteredBarber {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

interface ServiceStats {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface BarberStats {
  barber_id: string;
  barber_name: string;
  count: number;
  revenue: number;
}

export default function AdminDashboard() {
  const { profile, user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [registeredBarbers, setRegisteredBarbers] = useState<RegisteredBarber[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalServices, setTotalServices] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([]);
  const [barberStats, setBarberStats] = useState<BarberStats[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showAddBarberDialog, setShowAddBarberDialog] = useState(false);
  const [showAddServiceDialog, setShowAddServiceDialog] = useState(false);
  const [showAddAppointmentDialog, setShowAddAppointmentDialog] = useState(false);
  const [averageTicket, setAverageTicket] = useState(0);
  const [deletingBarber, setDeletingBarber] = useState<string | null>(null);
  const [showAddBarber, setShowAddBarber] = useState(false);
  const [newBarber, setNewBarber] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [addingBarber, setAddingBarber] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [completedAndCancelledAppointments, setCompletedAndCancelledAppointments] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportBarber, setReportBarber] = useState<string>('all');
  const [reportStartDate, setReportStartDate] = useState<string>('');
  const [reportEndDate, setReportEndDate] = useState<string>('');

  const isAdminBarber = profile?.profile_role === 'ADMIN_BARBER';
  const establishmentIdFilter = isAdminBarber ? profile?.establishment_id ?? null : null;

  // Apenas ADMIN_BARBER acessa o painel de gestão da unidade. SUPER_ADMIN usa /super-admin; BARBER não vê painel.
  useEffect(() => {
    if (authLoading || loading || !user) return;
    if (isSuperAdmin) {
      navigate('/super-admin', { replace: true });
      return;
    }
    if (!isAdminBarber && profile?.profile_role === 'BARBER') {
      navigate('/', { replace: true });
      return;
    }
    if (!isAdminBarber) {
      navigate('/', { replace: true });
      return;
    }
  }, [authLoading, loading, user, isSuperAdmin, isAdminBarber, profile?.profile_role, navigate]);

  useEffect(() => {
    fetchData();
  }, [period, establishmentIdFilter]);

  const fetchCompletedAppointments = async () => {
    setLoadingReports(true);

    let query = supabase
      .from('appointments')
      .select(`
        *,
        client:profiles!appointments_client_id_fkey(full_name),
        barber:profiles!appointments_barber_id_fkey(full_name),
        service:services(name, price, duration_minutes)
      `)
      .in('status', ['completed', 'cancelled'])
      .order('completed_at', { ascending: false, nullsFirst: false })
      .order('cancelled_at', { ascending: false, nullsFirst: false });

    if (reportBarber !== 'all') {
      query = query.eq('barber_id', reportBarber);
    }
    if (establishmentIdFilter) {
      query = query.eq('establishment_id', establishmentIdFilter);
    }

    if (reportStartDate) {
      query = query.gte('completed_at', reportStartDate + 'T00:00:00.000Z');
    }

    if (reportEndDate) {
      query = query.lt('completed_at', reportEndDate + 'T23:59:59.999Z');
    } else if (!reportStartDate) {
      // If no dates, default to current period
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

      query = query.gte('completed_at', startDate.toISOString()).lt('completed_at', endDate.toISOString());
    }

    const { data } = await query;

    if (data) {
      setCompletedAndCancelledAppointments(data);
    }
    setLoadingReports(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBarbers(),
        fetchRegisteredBarbers(),
        fetchFinancialStats(),
        fetchServiceStats(),
      ]);
    } catch (e) {
      console.error('AdminDashboard fetchData:', e);
      showError('Erro ao carregar dados do painel');
    } finally {
      setLoading(false);
    }
  };

  const fetchBarbers = async () => {
    if (isAdminBarber && !establishmentIdFilter) {
      setBarbers([]);
      return;
    }
    let query = supabase
      .from('profiles')
      .select('*')
      // Schema multitenant: profissionais usam profile_role; role legado pode divergir
      .in('profile_role', ['BARBER', 'ADMIN_BARBER'] as any)
      .neq('email', import.meta.env.VITE_SUPERADMIN_EMAIL || '')
      .order('full_name');
    if (establishmentIdFilter) query = query.eq('establishment_id', establishmentIdFilter);
    const { data } = await query;
    if (data) setBarbers(data);
  };

  const fetchRegisteredBarbers = async () => {
    if (!establishmentIdFilter) {
      setRegisteredBarbers([]);
      return;
    }
    const { data } = await supabase
      .from('registered_barbers')
      .select('*')
      .eq('establishment_id', establishmentIdFilter)
      .order('created_at', { ascending: false });

    if (data) {
      setRegisteredBarbers(data);
    }
  };

  const handleAddBarber = async () => {
    if (!newBarber.full_name || !newBarber.email || !newBarber.password) {
      showError('Nome, email e senha são obrigatórios');
      return;
    }

    if (!establishmentIdFilter) {
      showError('Estabelecimento não encontrado');
      return;
    }

    setAddingBarber(true);

    try {
      // Regra do plano: limita a quantidade de profissionais.
      const { data: estData } = await supabase
        .from('establishments')
        .select('max_barbers')
        .eq('id', establishmentIdFilter)
        .maybeSingle();

      const maxBarbers = estData?.max_barbers ?? 999;

      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('establishment_id', establishmentIdFilter)
        .in('profile_role', ['BARBER', 'ADMIN_BARBER'] as any);

      const currentBarbers = count ?? 0;
      if (currentBarbers >= maxBarbers) {
        showError('Limite do plano atingido. Faça upgrade para adicionar mais profissionais.');
        setAddingBarber(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'create-establishment-barber',
        {
          body: {
            email: newBarber.email.toLowerCase().trim(),
            password: newBarber.password,
            full_name: newBarber.full_name.trim(),
            phone: newBarber.phone || null,
            establishment_id: establishmentIdFilter,
          },
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        }
      );

      const payload = fnData as
        | { success?: boolean; error?: string; warning?: string; message?: string }
        | null;

      if (fnError || (payload?.error && !payload?.success)) {
        const detail = await messageFromFunctionsInvoke(fnData, fnError);
        console.error('create-establishment-barber:', fnError ?? detail, fnData);
        showError(detail);
        return;
      }
      if (!payload?.success) {
        showError('Não foi possível cadastrar o profissional. Tente novamente.');
        return;
      }

      // Usuário criado no Auth, mas atualização do perfil falhou (ex.: RLS)
      if (payload.warning) {
        showError(`Usuário criado, mas falhou ao vincular perfil: ${payload.warning}`);
        await Promise.all([fetchBarbers(), fetchRegisteredBarbers()]);
        return;
      }

      success(`Profissional cadastrado com sucesso! Email: ${newBarber.email}, Senha: ${newBarber.password}`);
      setNewBarber({ full_name: '', email: '', phone: '', password: '' });
      setShowAddBarber(false);
      await Promise.all([fetchBarbers(), fetchRegisteredBarbers()]);
    } catch (error: any) {
      console.error('Error adding barber:', error);
      showError('Erro ao cadastrar profissional');
    } finally {
      setAddingBarber(false);
    }
  };

  const handleDeleteRegisteredBarber = async (id: string) => {
    if (!establishmentIdFilter) {
      showError('Estabelecimento não encontrado');
      return;
    }
    try {
      const { error } = await supabase
        .from('registered_barbers')
        .delete()
        .eq('id', id)
        .eq('establishment_id', establishmentIdFilter);

      if (error) throw error;
      success('Profissional removido da lista');
      fetchRegisteredBarbers();
    } catch (error) {
      showError('Erro ao remover da lista');
    }
  };

  const fetchFinancialStats = async () => {
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

    let revQuery = supabase
      .from('appointments')
      .select(`
        barber_id,
        service:services(price, name),
        barber:profiles!appointments_barber_id_fkey(full_name)
      `)
      .eq('status', 'completed')
      .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
      .lte('appointment_date', format(endDate, 'yyyy-MM-dd'));
    if (establishmentIdFilter) revQuery = revQuery.eq('establishment_id', establishmentIdFilter);
    const { data } = await revQuery;

    if (data) {
      const total = data.reduce(
        (sum, item) => sum + (Number((item.service as any)?.price) || 0),
        0
      );
      setTotalRevenue(total);
      setTotalAppointments(data.length);
      setAverageTicket(data.length > 0 ? total / data.length : 0);

      // Calculate barber stats
      const barberMap = new Map<string, BarberStats>();
      data.forEach((apt) => {
        const barberId = apt.barber_id;
        const barberName = (apt.barber as any)?.full_name || 'Desconhecido';
        const price = Number((apt.service as any)?.price) || 0;

        if (barberMap.has(barberId)) {
          const existing = barberMap.get(barberId)!;
          existing.count += 1;
          existing.revenue += price;
        } else {
          barberMap.set(barberId, {
            barber_id: barberId,
            barber_name: barberName,
            count: 1,
            revenue: price,
          });
        }
      });

      setBarberStats(Array.from(barberMap.values()).sort((a, b) => b.revenue - a.revenue));
    }
  };

  const fetchServiceStats = async () => {
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

    let svcQuery = supabase
      .from('appointments')
      .select('service:services(name, price)')
      .eq('status', 'completed')
      .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
      .lte('appointment_date', format(endDate, 'yyyy-MM-dd'));
    if (establishmentIdFilter) svcQuery = svcQuery.eq('establishment_id', establishmentIdFilter);
    const { data } = await svcQuery;

    if (data) {
      const serviceMap = new Map<string, { count: number; revenue: number }>();
      
      data.forEach((apt) => {
        const name = (apt.service as any)?.name || 'Outro';
        const price = Number((apt.service as any)?.price) || 0;

        if (serviceMap.has(name)) {
          const existing = serviceMap.get(name)!;
          existing.count += 1;
          existing.revenue += price;
        } else {
          serviceMap.set(name, { count: 1, revenue: price });
        }
      });

      const total = data.length;
      const stats: ServiceStats[] = [];
      
      serviceMap.forEach((value, name) => {
        stats.push({
          name,
          count: value.count,
          revenue: value.revenue,
          percentage: total > 0 ? (value.count / total) * 100 : 0,
        });
      });

      setServiceStats(stats.sort((a, b) => b.count - a.count));
    }
  };

  const handleDeleteBarber = async (barberId: string) => {
    setDeletingBarber(barberId);

    try {
      // First get the barber data to access the email
      const { data: barber, error: fetchError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', barberId)
        .single();

      if (fetchError) {
        console.error('Error fetching barber data:', fetchError);
        throw fetchError;
      }

      // Delete appointments first
      const { error: aptError } = await supabase
        .from('appointments')
        .delete()
        .eq('barber_id', barberId);
      if (aptError) {
        console.error('Error deleting appointments:', aptError);
        throw aptError;
      }

      // Delete services
      const { error: svcError } = await supabase
        .from('services')
        .delete()
        .eq('barber_id', barberId);
      if (svcError) {
        console.error('Error deleting services:', svcError);
        throw svcError;
      }

      // Delete schedules
      const { error: schedError } = await supabase
        .from('barber_schedules')
        .delete()
        .eq('barber_id', barberId);
      if (schedError) {
        console.error('Error deleting schedules:', schedError);
        throw schedError;
      }

      // Delete profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', barberId);

      if (error) {
        console.error('Error deleting profile:', error);
        throw error;
      }

      // Delete user from Auth to free up the email
      if (barber.email) {
        const authResult = await deleteUserFromAuth(barber.email);
        if (authResult.error) {
          console.warn('Could not delete user from auth:', authResult.error);
          // Don't throw error - profile deletion was successful
        }
      }

      success('Profissional removido com sucesso');
      fetchBarbers();
    } catch (error: any) {
      console.error('Error deleting barber:', error);
      showError('Erro ao remover da lista');
    } finally {
      setDeletingBarber(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const generatePDF = () => {
    success('Relatório exibido na tela. Exportação em PDF será disponibilizada em breve.');
  };

  const pieColors = [
    'hsl(var(--primary))',
    'hsl(142, 76%, 36%)',
    'hsl(221, 83%, 53%)',
    'hsl(262, 83%, 58%)',
    'hsl(31, 97%, 52%)',
    'hsl(350, 89%, 60%)',
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-5 pt-12 pb-6 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            {isSuperAdmin ? (
              <h1 className="text-2xl font-bold text-foreground">Painel SuperAdmin</h1>
            ) : (
              <h1 className="text-2xl font-bold text-foreground">Painel Admin</h1>
            )}
          </div>
          <Button
            onClick={() => {
              setShowReports(true);
              fetchCompletedAppointments();
            }}
            variant="outline"
            className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
          >
            <FileText className="w-4 h-4" />
            Relatórios
          </Button>
        </div>

        {/* Period Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
              period === 'week'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground border border-border'
            }`}
          >
            Esta semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
              period === 'month'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground border border-border'
            }`}
          >
            Este mês
          </button>
        </div>
      </header>

      {/* Financial Overview */}
      <div className="px-5 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Visão Geral Financeira
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 border border-border/50 col-span-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Faturamento Total</span>
            </div>
            <p className="text-4xl font-bold text-foreground">
              {loading ? '...' : formatPrice(totalRevenue)}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-xs text-muted-foreground">Atendimentos</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {loading ? '...' : totalAppointments}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xs text-muted-foreground">Ticket Médio</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {loading ? '...' : formatPrice(averageTicket)}
            </p>
          </div>
        </div>
      </div>

      {/* Service Distribution - Pie Chart */}
      <div className="px-5 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-primary" />
          Serviços Realizados
        </h2>

        {loading ? (
          <div className="bg-card rounded-2xl p-4 border border-border/50 h-48 animate-pulse" />
        ) : serviceStats.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhum serviço realizado no período</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-4 border border-border/50">
            {/* Simple Pie Representation */}
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
                  {serviceStats.reduce((acc, stat, index) => {
                    const offset = acc.offset;
                    const percentage = stat.percentage;
                    const circumference = 2 * Math.PI * 10;
                    const strokeDasharray = (percentage / 100) * circumference;
                    
                    acc.elements.push(
                      <circle
                        key={stat.name}
                        cx="16"
                        cy="16"
                        r="10"
                        fill="none"
                        stroke={pieColors[index % pieColors.length]}
                        strokeWidth="6"
                        strokeDasharray={`${strokeDasharray} ${circumference}`}
                        strokeDashoffset={-offset}
                        className="transition-all duration-500"
                      />
                    );
                    
                    acc.offset += strokeDasharray;
                    return acc;
                  }, { offset: 0, elements: [] as JSX.Element[] }).elements}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-foreground">{totalAppointments}</span>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                {serviceStats.slice(0, 5).map((stat, index) => (
                  <div key={stat.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: pieColors[index % pieColors.length] }}
                    />
                    <span className="text-sm text-muted-foreground flex-1 truncate">
                      {stat.name}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {stat.percentage.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Faturamento por profissional */}
      <div className="px-5 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-primary" />
          Faturamento por profissional
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-4 animate-pulse border border-border/50">
                <div className="h-4 bg-muted rounded w-24 mb-2" />
                <div className="h-6 bg-muted rounded w-32" />
              </div>
            ))}
          </div>
        ) : barberStats.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhum atendimento no período</p>
          </div>
        ) : (
          <div className="space-y-3">
            {barberStats.map((stat, index) => {
              const maxRevenue = barberStats[0]?.revenue || 1;
              const widthPercent = (stat.revenue / maxRevenue) * 100;

              return (
                <div key={stat.barber_id} className="bg-card rounded-2xl p-4 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-medium text-foreground">{stat.barber_name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{stat.count} atend.</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  <p className="text-lg font-bold text-foreground">{formatPrice(stat.revenue)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Home Settings */}
      <div className="px-5 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Configurações da Home
        </h2>
        <HomeSettingsEditor />
      </div>

      {/* Cadastro de profissionais */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Cadastrar profissional
          </h2>
          <Button size="sm" className="gap-2" onClick={() => setShowAddBarber(true)}>
            <UserPlus className="w-4 h-4" />
            Adicionar
          </Button>
          <SimpleModal open={showAddBarber} onOpenChange={setShowAddBarber} title="Cadastrar novo profissional" description="Informe os dados do profissional. Ao fazer login com este email, ele terá acesso automático como profissional da loja.">
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="barber-name">Nome completo *</Label>
                  <Input
                    id="barber-name"
                    placeholder="Ex: João Silva"
                    value={newBarber.full_name}
                    onChange={(e) => setNewBarber({ ...newBarber, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="barber-email">Email *</Label>
                  <Input
                    id="barber-email"
                    type="email"
                    placeholder="joao@email.com"
                    value={newBarber.email}
                    onChange={(e) => setNewBarber({ ...newBarber, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="barber-phone">Telefone (opcional)</Label>
                  <Input
                    id="barber-phone"
                    placeholder="(11) 99999-9999"
                    value={newBarber.phone}
                    onChange={(e) => setNewBarber({ ...newBarber, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="barber-password">Senha de acesso *</Label>
                  <Input
                    id="barber-password"
                    type="password"
                    placeholder="Senha para o profissional acessar"
                    value={newBarber.password}
                    onChange={(e) => setNewBarber({ ...newBarber, password: e.target.value })}
                  />
                </div>
                <Button 
                  onClick={handleAddBarber} 
                  className="w-full"
                  disabled={addingBarber}
                >
                  {addingBarber ? 'Cadastrando...' : 'Cadastrar profissional'}
                </Button>
              </div>
          </SimpleModal>
        </div>

        {registeredBarbers.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-sm text-muted-foreground">Emails aguardando registro:</p>
            {registeredBarbers.map((rb) => {
              // Check if already has active profile
              const hasProfile = barbers.some(b => b.email.toLowerCase() === rb.email.toLowerCase());
              return (
                <div 
                  key={rb.id} 
                  className={`bg-card rounded-xl p-3 border flex items-center justify-between ${
                    hasProfile ? 'border-green-500/30 bg-green-500/5' : 'border-border/50'
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{rb.full_name}</p>
                    <p className="text-xs text-muted-foreground">{rb.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasProfile ? (
                      <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded-full">Ativo</span>
                    ) : (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Aguardando</span>
                    )}
                    {!hasProfile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteRegisteredBarber(rb.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Profissionais ativos */}
      <div className="px-5 pb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Profissionais ativos
        </h2>

        {barbers.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhum profissional ativo</p>
            <p className="text-xs text-muted-foreground mt-1">Cadastre um email acima e peça para o profissional fazer login</p>
          </div>
        ) : (
          <div className="space-y-3">
            {barbers.map((barber) => (
              <div 
                key={barber.id} 
                className="bg-card rounded-2xl p-4 border border-border/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    {barber.avatar_url ? (
                      <img 
                        src={barber.avatar_url} 
                        alt={barber.full_name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <Scissors className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{barber.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{barber.email}</p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm(`Remover permanentemente o profissional ${barber.full_name} e todos os seus dados?`)) {
                      handleDeleteBarber(barber.id);
                    }
                  }}
                  disabled={deletingBarber === barber.id}
                >
                  {deletingBarber === barber.id ? '...' : <Trash2 className="w-5 h-5" />}
                </Button>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Reports Modal */}
      <SimpleModal
        open={showReports}
        onOpenChange={setShowReports}
        title="Relatório de Procedimentos Concluídos e Cancelados"
        description="Detalhes de todos os procedimentos finalizados. Use os filtros abaixo para personalizar a visualização."
        className="max-w-4xl max-h-[80vh] overflow-y-auto"
      >
          {/* Filters */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="report-barber">Profissional</Label>
                <select
                  id="report-barber"
                  value={reportBarber}
                  onChange={(e) => setReportBarber(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="all">Todos os profissionais</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="report-start">Data Inicial</Label>
                <Input
                  id="report-start"
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="report-end">Data Final</Label>
                <Input
                  id="report-end"
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <Button onClick={fetchCompletedAppointments} className="w-full md:w-auto">
              Aplicar Filtros
            </Button>
          </div>

          {loadingReports ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-card rounded-xl p-4 animate-pulse border border-border/50">
                  <div className="h-4 bg-muted rounded w-32 mb-2" />
                  <div className="h-3 bg-muted rounded w-48" />
                </div>
              ))}
            </div>
          ) : completedAndCancelledAppointments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum procedimento concluído no período</p>
            </div>
          ) : (
            <div id="reports-content" className="space-y-3">
              {completedAndCancelledAppointments.map((appointment) => (
                <div key={appointment.id} className="bg-card rounded-xl p-4 border border-border/50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Scissors className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{(appointment.service as any)?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Cliente: {(appointment.client as any)?.full_name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {formatPrice(Number((appointment.service as any)?.price || 0))}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          appointment.status === 'completed'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                          {appointment.status === 'completed' ? 'Concluído' : 'Cancelado'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {appointment.status === 'completed'
                          ? format(parseISO(appointment.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : format(parseISO(appointment.cancelled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Profissional: {(appointment.barber as any)?.full_name}</span>
                    <span>Duração: {(appointment.service as any)?.duration_minutes} min</span>
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    Data do agendamento: {format(parseISO(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR })} às {appointment.start_time.slice(0, 5)}
                  </div>
                </div>
              ))}
            </div>
          )}
        <div className="mt-4 flex justify-end">
          {completedAndCancelledAppointments.length > 0 && (
            <Button onClick={generatePDF} variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              Download PDF
            </Button>
          )}
        </div>
      </SimpleModal>
    </div>
  );
}
