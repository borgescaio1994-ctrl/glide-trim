import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/hooks/useAuth';
import { deleteUserFromAuth } from '@/lib/authAdmin';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleModal } from '@/components/ui/SimpleModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Eye, Lock, Plus, Store, Users, Calendar, Trash2, CheckCircle2 } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { messageFromFunctionsInvoke } from '@/lib/edgeFunctionError';

type Establishment = {
  id: string;
  name: string;
  slug: string;
  custom_domain?: string | null;
  deleted_at?: string | null;
  onboarding_status?: 'PENDING' | 'ACTIVE' | string;
  whatsapp_sender_phone?: string | null;
  /** Nome da instância Evolution conectada ao WhatsApp da loja (envio a clientes) */
  whatsapp_evolution_instance?: string | null;
  plan_type: 'BRONZE' | 'PRATA' | 'OURO' | string;
  subscription_status: boolean;
  expires_at: string | null;
  max_barbers: number | null;
  status: boolean;
};

type Owner = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  phone_number: string | null;
  establishment_id: string | null;
};

type Plan = {
  plan_type: 'BRONZE' | 'PRATA' | 'OURO' | string;
  description: string | null;
  price: number;
  payment_method: string;
  max_barbers: number;
  is_active: boolean;
};

function formatDueDate(dueAt: string | null) {
  if (!dueAt) return '-';
  try {
    return format(parseISO(dueAt), 'dd/MM/yyyy');
  } catch {
    return dueAt;
  }
}

function isPaymentPending(e: Establishment) {
  if (!e.subscription_status) return true;
  if (!e.expires_at) return false;
  const due = new Date(e.expires_at).getTime();
  return due < Date.now();
}

export default function SuperAdminCRM() {
  const { profile } = useAuth();
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [globalAppointmentsCount, setGlobalAppointmentsCount] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planDrafts, setPlanDrafts] = useState<Record<string, Plan>>({});
  const [plansSaving, setPlansSaving] = useState(false);
  const [masterSenderPhone, setMasterSenderPhone] = useState('');
  const [masterEvolutionInstance, setMasterEvolutionInstance] = useState('');
  const [savingMasterSender, setSavingMasterSender] = useState(false);
  const [masterSaved, setMasterSaved] = useState(false);

  const [detailsEvolutionDraft, setDetailsEvolutionDraft] = useState('');
  const [savingDetailsEvolution, setSavingDetailsEvolution] = useState(false);

  const [filterInactive, setFilterInactive] = useState(false);
  const [filterPaymentPending, setFilterPaymentPending] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsEst, setDetailsEst] = useState<Establishment | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsCount, setDetailsCount] = useState(0);

  const [newUnitOpen, setNewUnitOpen] = useState(false);
  const [newUnitLoading, setNewUnitLoading] = useState(false);
  const [newUnit, setNewUnit] = useState({
    establishment_name: '',
    establishment_slug: '',
    establishment_domain: '',
    owner_full_name: '',
    owner_email: '',
    owner_phone: '',
    owner_password: '',
    plan_type: 'BRONZE' as 'BRONZE' | 'PRATA' | 'OURO',
    expires_at: '',
  });

  const ownersByEstablishment = useMemo(() => {
    const map: Record<string, Owner> = {};
    owners.forEach((o) => {
      if (!o.establishment_id) return;
      if (!map[o.establishment_id]) map[o.establishment_id] = o;
    });
    return map;
  }, [owners]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [estRes, ownerRes, aptRes, plansRes] = await Promise.all([
        supabase
          .from('establishments')
          .select('id, name, slug, custom_domain, deleted_at, onboarding_status, whatsapp_sender_phone, whatsapp_evolution_instance, plan_type, subscription_status, expires_at, max_barbers, status')
          .order('name'),
        supabase
          .from('profiles')
          .select('id, full_name, email, phone, phone_number, establishment_id')
          .eq('profile_role', 'ADMIN_BARBER')
          .order('full_name'),
        supabase.from('appointments').select('id', { count: 'exact', head: true }),
        supabase
          .from('plans')
          .select('plan_type, description, price, payment_method, max_barbers, is_active')
          .order('plan_type'),
      ]);

      if (estRes.error) throw estRes.error;
      if (ownerRes.error) throw ownerRes.error;
      if (plansRes.error) throw plansRes.error;

      const estRows = ((estRes.data ?? []) as Establishment[]).filter((e) => !e.deleted_at);
      setEstablishments(estRows);
      setOwners((ownerRes.data ?? []) as Owner[]);
      setGlobalAppointmentsCount(aptRes.count ?? 0);
      setPlans((plansRes.data ?? []) as Plan[]);

      const { data: masterRow } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'master_sender_phone')
        .maybeSingle();
      setMasterSenderPhone((masterRow?.value as string) || '');

      const { data: masterEvRow } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'master_evolution_instance')
        .maybeSingle();
      setMasterEvolutionInstance((masterEvRow?.value as string)?.trim() || 'caio_zap');
    } catch (err: any) {
      showError(err?.message || 'Erro ao carregar CRM');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const next: Record<string, Plan> = {};
    plans.forEach((p) => {
      next[p.plan_type] = p;
    });
    setPlanDrafts(next);
  }, [plans]);

  const inactiveCount = useMemo(() => establishments.filter((e) => !e.subscription_status).length, [establishments]);

  const filtered = useMemo(() => {
    return establishments.filter((e) => {
      const paymentPending = isPaymentPending(e);
      if (filterInactive && e.subscription_status) return false;
      if (filterPaymentPending && !paymentPending) return false;
      return true;
    });
  }, [establishments, filterInactive, filterPaymentPending]);

  const handleDisableEstablishment = async (establishmentId: string) => {
    if (!confirm('Desativar esta loja? Isso bloqueia o acesso do Admin e o agendamento público (manutenção).')) return;
    const { error } = await supabase
      .from('establishments')
      .update({ subscription_status: false })
      .eq('id', establishmentId);

    if (error) {
      showError(error.message);
      return;
    }
    success('Loja desativada (inadimplência).');
    await refresh();
  };

  const handleSavePlan = async (planType: Plan['plan_type']) => {
    const draft = planDrafts[planType];
    if (!draft) return;

    setPlansSaving(true);
    try {
      const { error } = await supabase.from('plans').upsert({
        plan_type: planType,
        description: draft.description,
        price: Number(draft.price ?? 0),
        payment_method: String(draft.payment_method ?? '').trim() || 'PIX',
        max_barbers: Number(draft.max_barbers ?? 1),
        is_active: draft.is_active ?? true,
      });

      if (error) throw error;

      success('Plano atualizado com sucesso!');
      await refresh();
    } catch (err: any) {
      showError(err?.message || 'Erro ao salvar plano');
    } finally {
      setPlansSaving(false);
    }
  };

  const handleSaveMasterSender = async () => {
    setSavingMasterSender(true);
    try {
      const cleaned = masterSenderPhone.replace(/\D/g, '');
      const normalized = cleaned ? (cleaned.startsWith('55') ? cleaned : `55${cleaned}`) : '';

      if (normalized && normalized.length < 12) {
        showError('Número MASTER inválido. Use DDD + número (com 55).');
        return;
      }

      const inst = masterEvolutionInstance.trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'caio_zap';

      const { error: e1 } = await supabase.from('system_settings').upsert({
        key: 'master_sender_phone',
        value: normalized || null,
      });
      if (e1) throw e1;

      const { error: e2 } = await supabase.from('system_settings').upsert({
        key: 'master_evolution_instance',
        value: inst,
      });
      if (e2) throw e2;

      setMasterSenderPhone(normalized);
      setMasterEvolutionInstance(inst);
      setMasterSaved(true);
      success('Configuração MASTER salva (número + Evolution)!');
      setTimeout(() => setMasterSaved(false), 2500);
    } catch (err: any) {
      showError(err?.message || 'Erro ao salvar número MASTER');
    } finally {
      setSavingMasterSender(false);
    }
  };

  const handleSaveDetailsEvolution = async () => {
    if (!detailsEst) return;
    setSavingDetailsEvolution(true);
    try {
      const inst = detailsEvolutionDraft.trim().replace(/[^a-zA-Z0-9_-]/g, '') || null;
      const { error } = await supabase
        .from('establishments')
        .update({ whatsapp_evolution_instance: inst } as any)
        .eq('id', detailsEst.id);
      if (error) throw error;
      success('Instância Evolution da loja salva!');
      setDetailsEst((prev) => (prev ? { ...prev, whatsapp_evolution_instance: inst } : prev));
      await refresh();
    } catch (err: any) {
      showError(err?.message || 'Erro ao salvar instância');
    } finally {
      setSavingDetailsEvolution(false);
    }
  };

  const handleDeleteEstablishment = async (est: Establishment) => {
    const ok = confirm(`Excluir "${est.name}" da lista? Isso fará exclusão lógica (pode ser recuperado no banco).`);
    if (!ok) return;

    const now = Date.now();
    const archivedSlug = `${est.slug}--deleted-${now}`;

    // First get the owner's email to delete from Auth
    const { data: ownerData, error: ownerError } = await supabase
      .from('profiles')
      .select('email')
      .eq('establishment_id', est.id)
      .eq('profile_role', 'ADMIN_OWNER')
      .maybeSingle();

    if (ownerError && ownerError.code !== 'PGRST116') {
      console.error('Error fetching owner data:', ownerError);
    }

    const { error } = await supabase
      .from('establishments')
      .update({
        deleted_at: new Date().toISOString(),
        status: false,
        subscription_status: false,
        // Libera slug e domínio para novo cadastro
        slug: archivedSlug,
        custom_domain: null,
      } as any)
      .eq('id', est.id);

    if (error) {
      console.error('Error archiving establishment:', error);
      showError('Erro ao arquivar unidade');
      return;
    }

    // Delete owner from Auth to free up the email
    if (ownerData?.email) {
      const authResult = await deleteUserFromAuth(ownerData.email);
      if (authResult.error) {
        console.warn('Could not delete owner from auth:', authResult.error);
        // Don't show error - establishment deletion was successful
      }
    }

    success('Unidade arquivada com sucesso');
    fetchEstablishments();
  };

  const handleOpenDetails = async (est: Establishment) => {
    setDetailsEst(est);
    setDetailsEvolutionDraft((est.whatsapp_evolution_instance as string | undefined)?.trim() || '');
    setDetailsCount(0);
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('appointments')
        .select('id')
        .eq('establishment_id', est.id)
        .gte('appointment_date', startStr)
        .lte('appointment_date', endStr);

      if (error) throw error;
      setDetailsCount((data ?? []).length);
    } catch (err: any) {
      showError(err?.message || 'Erro ao carregar detalhes');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCreateUnit = async () => {
    if (!newUnit.establishment_name.trim() || !newUnit.establishment_slug.trim()) {
      showError('Preencha nome e slug da loja.');
      return;
    }
    if (!newUnit.owner_full_name.trim() || !newUnit.owner_email.trim() || !newUnit.owner_password.trim()) {
      showError('Preencha nome, e-mail e senha do dono.');
      return;
    }

    setNewUnitLoading(true);
    try {
      const slug = newUnit.establishment_slug.trim().toLowerCase();
      const customDomain = newUnit.establishment_domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
      const domainWithHttps = customDomain ? `https://${customDomain}` : null;

      // Validação antecipada para evitar erro genérico 409 (unique conflict)
      const { data: slugExists, error: slugCheckErr } = await supabase
        .from('establishments')
        .select('id')
        .eq('slug', slug)
        .is('deleted_at', null)
        .limit(1);
      if (slugCheckErr) throw slugCheckErr;
      if ((slugExists ?? []).length > 0) {
        showError('Este slug já está em uso. Escolha outro slug para a unidade.');
        return;
      }

      if (customDomain) {
        const { data: domainExists, error: domainCheckErr } = await supabase
          .from('establishments')
          .select('id')
          .ilike('custom_domain', domainWithHttps || '')
          .is('deleted_at', null)
          .limit(1);
        if (domainCheckErr) throw domainCheckErr;
        if ((domainExists ?? []).length > 0) {
          showError('Este domínio já está cadastrado em outra unidade.');
          return;
        }
      }

      const planToMaxBarbers = (pt: Plan['plan_type']) => {
        if (pt === 'BRONZE') return 1;
        if (pt === 'PRATA') return 3;
        if (pt === 'OURO') return 999999;
        return 1;
      };

      const expiresAtIso = newUnit.expires_at?.trim()
        ? new Date(newUnit.expires_at).toISOString()
        : null;

      // Se não tiver vencimento, assume ativo.
      const subscriptionStatus =
        expiresAtIso && new Date(expiresAtIso).getTime() < Date.now()
          ? false
          : true;

      // 1) Cria o estabelecimento
      const { data: createdEst, error: insErr } = await supabase
        .from('establishments')
        .insert({
          name: newUnit.establishment_name.trim(),
          slug,
          custom_domain: domainWithHttps || null,
          onboarding_status: 'PENDING',
          plan_type: newUnit.plan_type,
          subscription_status: subscriptionStatus,
          expires_at: expiresAtIso,
          max_barbers: planToMaxBarbers(newUnit.plan_type),
          status: true,
        })
        .select('id')
        .single();

      if (insErr) {
        // 23505 = unique violation (slug/domain duplicado)
        if ((insErr as any).code === '23505') {
          const message = String((insErr as any).message || '').toLowerCase();
          if (message.includes('slug')) {
            showError('Este slug já está em uso. Escolha outro slug para a unidade.');
            return;
          }
          if (message.includes('custom_domain')) {
            showError('Este domínio já está cadastrado em outra unidade.');
            return;
          }
          showError('Conflito ao criar unidade: slug ou domínio já existe.');
          return;
        }
        throw insErr;
      }
      const createdEstablishmentId = createdEst?.id as string | undefined;
      if (!createdEstablishmentId) {
        throw new Error('Estabelecimento criado, mas id não retornou.');
      }

      // 2) Cria o dono (ADMIN_BARBER) via Edge Function
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const invokeResult = await supabase.functions.invoke('create-establishment-owner', {
        body: {
          email: newUnit.owner_email.trim().toLowerCase(),
          password: newUnit.owner_password,
          full_name: newUnit.owner_full_name.trim(),
          phone: newUnit.owner_phone || null,
          establishment_id: createdEstablishmentId,
        },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      if (invokeResult.error) {
        const detail = await messageFromFunctionsInvoke(invokeResult.data, invokeResult.error);
        await supabase.from('establishments').delete().eq('id', createdEstablishmentId);
        showError(detail);
        return;
      }

      success('Nova unidade criada com sucesso!');
      setNewUnitOpen(false);
      setNewUnit({
        establishment_name: '',
        establishment_slug: '',
        establishment_domain: '',
        owner_full_name: '',
        owner_email: '',
        owner_phone: '',
        owner_password: '',
        plan_type: 'BRONZE',
        expires_at: '',
      });
      await refresh();
    } catch (err: any) {
      showError(err?.message || 'Erro ao criar unidade');
    } finally {
      setNewUnitLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-5 pt-12 pb-6 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Gestão de Franquias</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className="gap-2 border-primary/50 text-primary hover:bg-primary/10" onClick={() => setNewUnitOpen(true)}>
              <Plus className="w-4 h-4" />
              Nova Unidade
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl p-4 border border-border/50 flex items-center gap-3 col-span-1">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{loading ? '...' : establishments.length}</p>
              <p className="text-xs text-muted-foreground">Total de Lojas</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border/50 flex items-center gap-3 col-span-1">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{loading ? '...' : inactiveCount}</p>
              <p className="text-xs text-muted-foreground">Lojas Inativas</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border/50 flex items-center gap-3 col-span-1">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{loading ? '...' : globalAppointmentsCount}</p>
              <p className="text-xs text-muted-foreground">Total de Agendamentos Geral</p>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="px-5 pb-6">
        <div className="bg-card rounded-2xl p-4 border border-border/50 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Checkbox checked={filterInactive} onCheckedChange={(v) => setFilterInactive(!!v)} />
            <Label>Lojas inativas</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={filterPaymentPending} onCheckedChange={(v) => setFilterPaymentPending(!!v)} />
            <Label>Pagamento Pendente</Label>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">{loading ? '...' : filtered.length + ' resultado(s)'}</div>
        </div>
      </div>

      {/* Número MASTER (SUPER_ADMIN) */}
      <div className="px-5 pb-6">
        <div className="bg-card rounded-2xl p-4 border border-border/50 space-y-2">
          <div className="text-sm font-semibold">Número MASTER (WhatsApp / n8n)</div>
          <div className="text-xs text-muted-foreground">
            O <strong>número master</strong> envia o código para o <strong>dono</strong> verificar o WhatsApp. A <strong>instância Evolution</strong> é a conexão WhatsApp desse número (ex.: caio_zap).
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">WhatsApp MASTER (55…)</Label>
              <Input
                value={masterSenderPhone}
                onChange={(e) => setMasterSenderPhone(e.target.value)}
                placeholder="55DDDNÚMERO"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Instância Evolution (master)</Label>
              <Input
                value={masterEvolutionInstance}
                onChange={(e) => setMasterEvolutionInstance(e.target.value)}
                placeholder="caio_zap"
              />
            </div>
          </div>
          <Button onClick={handleSaveMasterSender} disabled={savingMasterSender} className="w-full sm:w-auto">
            {savingMasterSender ? 'Salvando...' : 'Salvar MASTER'}
          </Button>
          <div className="text-xs flex items-center gap-2">
            <span className="text-muted-foreground">Atual:</span>
            <span className="font-medium">{masterSenderPhone || '-'}</span>
            {masterSaved ? (
              <span className="inline-flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                Salvo
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-5 pb-10">
        {loading ? (
          <div className="flex justify-center py-12">
            <Store className="w-8 h-8 text-muted-foreground animate-pulse" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da loja</TableHead>
                <TableHead>Domínio</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Evolution</TableHead>
                <TableHead>Onboarding</TableHead>
                <TableHead>Nome do Dono</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Plano Atual</TableHead>
                <TableHead>Data de Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-10">
                    Nenhuma unidade encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => {
                  const owner = ownersByEstablishment[e.id];
                  const paymentPending = isPaymentPending(e);
                  const statusText = e.subscription_status ? 'Ativo' : 'Inativo';
                  const onboardingText = (e as any).onboarding_status === 'ACTIVE' ? 'ATIVO' : 'PENDENTE';
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{(e as any).custom_domain || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{(e as any).whatsapp_sender_phone || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {(e as any).whatsapp_evolution_instance || '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${(e as any).onboarding_status === 'ACTIVE' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
                          {onboardingText}
                        </span>
                      </TableCell>
                      <TableCell>{owner?.full_name || '-'}</TableCell>
                      <TableCell>{owner?.phone_number || owner?.phone || '-'}</TableCell>
                      <TableCell>{owner?.email || '-'}</TableCell>
                      <TableCell>{e.plan_type || '-'}</TableCell>
                      <TableCell>{formatDueDate(e.expires_at)}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            e.subscription_status
                              ? 'bg-green-500/10 text-green-600'
                              : paymentPending
                                ? 'bg-yellow-500/10 text-yellow-600'
                                : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {statusText}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="h-9 px-3" onClick={() => handleOpenDetails(e)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-9 px-3"
                            disabled={!e.subscription_status}
                            onClick={() => handleDisableEstablishment(e.id)}
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            Desativar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 px-3 border-destructive/40 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteEstablishment(e)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Planos: editar descrição, valor e forma de pagamento */}
      <div className="mt-6 p-4 bg-card rounded-xl border border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Planos</h3>
          {plansSaving ? (
            <span className="text-sm text-muted-foreground">Salvando...</span>
          ) : null}
        </div>

        {plans.length === 0 ? (
          <div className="text-sm text-muted-foreground">Carregando planos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(['BRONZE', 'PRATA', 'OURO'] as const).map((pt) => {
              const d = planDrafts[pt];
              if (!d) return null;

              return (
                <div key={pt} className="bg-muted/20 rounded-xl p-4 border border-border/50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{pt}</h4>
                  </div>

                  <div className="mt-3 space-y-3">
                    <div className="space-y-1">
                      <Label>Descrição</Label>
                      <textarea
                        value={d.description ?? ''}
                        onChange={(e) =>
                          setPlanDrafts((prev) => ({
                            ...prev,
                            [pt]: { ...prev[pt], description: e.target.value },
                          }))
                        }
                        className="min-h-20 w-full rounded-xl border border-border bg-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Valor</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={d.price ?? 0}
                        onChange={(e) =>
                          setPlanDrafts((prev) => ({
                            ...prev,
                            [pt]: { ...prev[pt], price: Number(e.target.value) },
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Forma de pagamentos</Label>
                      <Input
                        value={d.payment_method ?? ''}
                        onChange={(e) =>
                          setPlanDrafts((prev) => ({
                            ...prev,
                            [pt]: { ...prev[pt], payment_method: e.target.value },
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Limite de profissionais</Label>
                      <Input
                        type="number"
                        value={d.max_barbers ?? 1}
                        onChange={(e) =>
                          setPlanDrafts((prev) => ({
                            ...prev,
                            [pt]: { ...prev[pt], max_barbers: Number(e.target.value) },
                          }))
                        }
                      />
                    </div>

                    <Button size="sm" className="w-full" onClick={() => handleSavePlan(pt)} disabled={plansSaving}>
                      Salvar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: New Unit */}
      <SimpleModal
        open={newUnitOpen}
        onOpenChange={setNewUnitOpen}
        title="Nova Unidade"
        description="Cria o estabelecimento e o dono (ADMIN_BARBER)."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da loja *</Label>
            <Input value={newUnit.establishment_name} onChange={(e) => setNewUnit((p) => ({ ...p, establishment_name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Slug *</Label>
            <Input value={newUnit.establishment_slug} onChange={(e) => setNewUnit((p) => ({ ...p, establishment_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
          </div>
          <div className="space-y-2">
            <Label>Domínio (opcional)</Label>
            <Input
              value={newUnit.establishment_domain}
              onChange={(e) => setNewUnit((p) => ({ ...p, establishment_domain: e.target.value }))}
              placeholder="ex: barbearia.seudominio.com"
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Um domínio por loja:</strong> configure o DNS (registo <strong>A</strong> ou <strong>CNAME</strong>)
                para o IP do servidor e use o <strong>mesmo</strong> hostname aqui, sem <code className="text-[11px]">https://</code>.
              </p>
              <p>
                No servidor, emita ou renove o certificado HTTPS (ex.: Certbot) para esse hostname.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Plano *</Label>
            <select
              value={newUnit.plan_type}
              onChange={(e) => setNewUnit((p) => ({ ...p, plan_type: e.target.value as any }))}
              className="flex h-11 w-full rounded-xl border border-border bg-input px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="BRONZE">BRONZE</option>
              <option value="PRATA">PRATA</option>
              <option value="OURO">OURO</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Vencimento (opcional)</Label>
            <Input type="date" value={newUnit.expires_at} onChange={(e) => setNewUnit((p) => ({ ...p, expires_at: e.target.value }))} />
          </div>

          <div className="pt-2 border-t border-border/60">
            <div className="space-y-2">
              <Label>Nome do Dono *</Label>
              <Input value={newUnit.owner_full_name} onChange={(e) => setNewUnit((p) => ({ ...p, owner_full_name: e.target.value }))} />
            </div>
            <div className="space-y-2 mt-3">
              <Label>E-mail do Dono *</Label>
              <Input value={newUnit.owner_email} onChange={(e) => setNewUnit((p) => ({ ...p, owner_email: e.target.value }))} />
            </div>
            <div className="space-y-2 mt-3">
              <Label>Senha do Dono *</Label>
              <Input
                type="password"
                value={newUnit.owner_password}
                onChange={(e) => setNewUnit((p) => ({ ...p, owner_password: e.target.value }))}
                placeholder="Defina uma senha"
              />
            </div>
            <div className="space-y-2 mt-3">
              <Label>WhatsApp (opcional)</Label>
              <Input value={newUnit.owner_phone} onChange={(e) => setNewUnit((p) => ({ ...p, owner_phone: e.target.value }))} placeholder="DDD + Número" />
            </div>
          </div>

          <Button disabled={newUnitLoading} onClick={handleCreateUnit} className="w-full gap-2">
            {newUnitLoading ? <Loader /> : null}
            {newUnitLoading ? 'Criando...' : 'Salvar'}
          </Button>
        </div>
      </SimpleModal>

      {/* Modal: Details */}
      <SimpleModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        title="Detalhes do Mês"
        description={detailsEst ? `Loja: ${detailsEst.name}` : undefined}
      >
        <div className="space-y-4">
          <div className="bg-card rounded-xl p-4 border border-border/50">
            <div className="text-sm text-muted-foreground">Agendamentos no mês</div>
            <div className="text-3xl font-bold text-foreground mt-1">
              {detailsLoading ? '...' : detailsCount}
            </div>
          </div>
          <div className="space-y-2 border border-border/50 rounded-xl p-4">
            <Label className="text-sm font-medium">Evolution — WhatsApp da loja (códigos para clientes)</Label>
            <p className="text-xs text-muted-foreground">
              Nome da instância na Evolution conectada ao número do dono (após ele verificar). Ex.: minha_loja_stoffels
            </p>
            <div className="flex gap-2">
              <Input
                className="font-mono"
                value={detailsEvolutionDraft}
                onChange={(e) => setDetailsEvolutionDraft(e.target.value)}
                placeholder="nome_da_instancia"
              />
              <Button type="button" variant="secondary" disabled={savingDetailsEvolution} onClick={handleSaveDetailsEvolution}>
                {savingDetailsEvolution ? '...' : 'Salvar'}
              </Button>
            </div>
          </div>
          <Button onClick={() => setDetailsOpen(false)} className="w-full">
            OK
          </Button>
        </div>
      </SimpleModal>
    </div>
  );
}

function Loader() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />;
}

