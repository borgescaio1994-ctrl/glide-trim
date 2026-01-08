import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Users,
  Scissors,
  Trash2,
  PieChart,
  BarChart3,
  Crown,
  AlertCircle,
  Settings,
  UserPlus,
  X,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import HomeSettingsEditor from '@/components/admin/HomeSettingsEditor';

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
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [registeredBarbers, setRegisteredBarbers] = useState<RegisteredBarber[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [averageTicket, setAverageTicket] = useState(0);
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([]);
  const [barberStats, setBarberStats] = useState<BarberStats[]>([]);
  const [deletingBarber, setDeletingBarber] = useState<string | null>(null);
  const [showAddBarber, setShowAddBarber] = useState(false);
  const [newBarber, setNewBarber] = useState({ full_name: '', email: '', phone: '' });
  const [addingBarber, setAddingBarber] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [completedAndCancelledAppointments, setCompletedAndCancelledAppointments] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportBarber, setReportBarber] = useState<string>('all');
  const [reportStartDate, setReportStartDate] = useState<string>('');
  const [reportEndDate, setReportEndDate] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [period]);

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
    await Promise.all([
      fetchBarbers(),
      fetchRegisteredBarbers(),
      fetchFinancialStats(),
      fetchServiceStats(),
    ]);
    setLoading(false);
  };

  const fetchBarbers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'barber')
      .order('full_name');

    if (data) {
      setBarbers(data);
    }
  };

  const fetchRegisteredBarbers = async () => {
    const { data } = await supabase
      .from('registered_barbers')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setRegisteredBarbers(data);
    }
  };

  const handleAddBarber = async () => {
    if (!newBarber.full_name || !newBarber.email) {
      toast.error('Nome e email são obrigatórios');
      return;
    }

    setAddingBarber(true);

    try {
      // Insert into registered_barbers table
      const { error } = await supabase
        .from('registered_barbers')
        .insert({
          email: newBarber.email.toLowerCase().trim(),
          full_name: newBarber.full_name,
          phone: newBarber.phone || null,
        });

      if (error) {
        console.error('Error inserting barber:', error);
        toast.error('Erro ao cadastrar barbeiro');
        setAddingBarber(false);
        return;
      }

      toast.success('Barbeiro cadastrado com sucesso! Peça para ele fazer cadastro no app com este email e senha: BARBEIRO2026');
      setNewBarber({ full_name: '', email: '', phone: '' });
      setShowAddBarber(false);
      fetchRegisteredBarbers();
    } catch (error: any) {
      console.error('Error adding barber:', error);
      toast.error('Erro ao cadastrar barbeiro');
    } finally {
      setAddingBarber(false);
    }
  };

  const handleDeleteRegisteredBarber = async (id: string) => {
    try {
      const { error } = await supabase
        .from('registered_barbers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Barbeiro removido da lista');
      fetchRegisteredBarbers();
    } catch (error) {
      toast.error('Erro ao remover barbeiro');
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

    const { data } = await supabase
      .from('appointments')
      .select(`
        barber_id,
        service:services(price, name),
        barber:profiles!appointments_barber_id_fkey(full_name)
      `)
      .eq('status', 'completed')
      .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
      .lte('appointment_date', format(endDate, 'yyyy-MM-dd'));

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

    const { data } = await supabase
      .from('appointments')
      .select('service:services(name, price)')
      .eq('status', 'completed')
      .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
      .lte('appointment_date', format(endDate, 'yyyy-MM-dd'));

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
      console.log('Starting barber deletion for ID:', barberId);

      // Delete appointments first
      console.log('Deleting appointments...');
      const { error: aptError } = await supabase
        .from('appointments')
        .delete()
        .eq('barber_id', barberId);
      if (aptError) {
        console.error('Error deleting appointments:', aptError);
        throw aptError;
      }

      // Delete services
      console.log('Deleting services...');
      const { error: svcError } = await supabase
        .from('services')
        .delete()
        .eq('barber_id', barberId);
      if (svcError) {
        console.error('Error deleting services:', svcError);
        throw svcError;
      }

      // Delete schedules
      console.log('Deleting schedules...');
      const { error: schError } = await supabase
        .from('barber_schedules')
        .delete()
        .eq('barber_id', barberId);
      if (schError) {
        console.error('Error deleting schedules:', schError);
        throw schError;
      }

      // Delete gallery
      console.log('Deleting gallery...');
      const { error: galError } = await supabase
        .from('barber_gallery')
        .delete()
        .eq('barber_id', barberId);
      if (galError) {
        console.error('Error deleting gallery:', galError);
        throw galError;
      }

      // Delete profile
      console.log('Deleting profile...');
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', barberId);

      if (error) {
        console.error('Error deleting profile:', error);
        throw error;
      }

      console.log('Barber deletion completed successfully');
      toast.success('Barbeiro removido com sucesso');
      fetchBarbers();
    } catch (error: any) {
      console.error('Error deleting barber:', error);
      toast.error('Erro ao remover barbeiro');
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

  const generatePDF = async () => {
    const element = document.getElementById('reports-content');
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save('relatorio-procedimentos.pdf');
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
            <Crown className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Painel Admin</h1>
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

      {/* Revenue by Barber */}
      <div className="px-5 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-primary" />
          Faturamento por Barbeiro
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

      {/* Add Barber Section */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Cadastrar Barbeiro
          </h2>
          <Dialog open={showAddBarber} onOpenChange={setShowAddBarber}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Barbeiro</DialogTitle>
                <DialogDescription>
                  Informe os dados do barbeiro. Quando ele fizer login com este email, terá acesso automático como barbeiro.
                </DialogDescription>
              </DialogHeader>
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
                <Button 
                  onClick={handleAddBarber} 
                  className="w-full"
                  disabled={addingBarber}
                >
                  {addingBarber ? 'Cadastrando...' : 'Cadastrar Barbeiro'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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

      {/* Active Barbers Management */}
      <div className="px-5 pb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Barbeiros Ativos
        </h2>

        {barbers.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhum barbeiro ativo</p>
            <p className="text-xs text-muted-foreground mt-1">Cadastre um email acima e peça para o barbeiro fazer login</p>
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

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover barbeiro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá remover permanentemente o barbeiro <strong>{barber.full_name}</strong> e todos os seus dados (serviços, agendamentos, galeria).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteBarber(barber.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {deletingBarber === barber.id ? 'Removendo...' : 'Remover'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Reports Dialog */}
      <Dialog open={showReports} onOpenChange={setShowReports}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Relatório de Procedimentos Concluídos e Cancelados
            </DialogTitle>
            <DialogDescription>
              Detalhes de todos os procedimentos finalizados. Use os filtros abaixo para personalizar a visualização.
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="report-barber">Barbeiro</Label>
                <select
                  id="report-barber"
                  value={reportBarber}
                  onChange={(e) => setReportBarber(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="all">Todos os barbeiros</option>
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
                    <span>Barbeiro: {(appointment.barber as any)?.full_name}</span>
                    <span>Duração: {(appointment.service as any)?.duration_minutes} min</span>
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    Data do agendamento: {format(parseISO(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR })} às {appointment.start_time.slice(0, 5)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          {completedAndCancelledAppointments.length > 0 && (
            <Button onClick={generatePDF} variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              Download PDF
            </Button>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  );
}
