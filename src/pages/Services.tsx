import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Scissors, Clock, DollarSign, Trash2, Edit2, ArrowLeft, X, Loader2 } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
}

export default function Services() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 30,
    price: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchServices();
    }
  }, [profile?.id]);

  const fetchServices = async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('barber_id', profile.id)
      .order('created_at', { ascending: false });

    if (data) {
      setServices(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    setSaving(true);

    try {
      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update({
            name: formData.name,
            description: formData.description || null,
            duration_minutes: formData.duration_minutes,
            price: formData.price,
          })
          .eq('id', editingService.id);

        if (error) throw error;
        toast.success('Serviço atualizado!');
      } else {
        const { error } = await supabase
          .from('services')
          .insert({
            barber_id: profile.id,
            name: formData.name,
            description: formData.description || null,
            duration_minutes: formData.duration_minutes,
            price: formData.price,
          });

        if (error) throw error;
        toast.success('Serviço criado!');
      }

      resetForm();
      fetchServices();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price: Number(service.price),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir serviço');
    } else {
      toast.success('Serviço excluído!');
      fetchServices();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', duration_minutes: 30, price: 0 });
    setEditingService(null);
    setShowForm(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
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
          <h1 className="text-2xl font-bold text-foreground">Meus Serviços</h1>
        </div>
      </header>

      {/* Form */}
      {showForm && (
        <div className="px-5 mb-6">
          <div className="bg-card rounded-2xl p-5 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <button onClick={resetForm} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-foreground">Nome do serviço</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Corte de cabelo"
                  required
                  className="mt-1 bg-input border-border"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-foreground">Descrição (opcional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do serviço"
                  className="mt-1 bg-input border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration" className="text-foreground">Duração (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    min={5}
                    required
                    className="mt-1 bg-input border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="price" className="text-foreground">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    min={0}
                    required
                    className="mt-1 bg-input border-border"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full h-12 bg-primary hover:bg-primary/90"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  editingService ? 'Salvar alterações' : 'Criar serviço'
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Add Button */}
      {!showForm && (
        <div className="px-5 mb-6">
          <Button
            onClick={() => setShowForm(true)}
            className="w-full h-12 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar serviço
          </Button>
        </div>
      )}

      {/* Services List */}
      <div className="px-5 pb-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-4 animate-pulse border border-border/50">
                <div className="h-5 bg-muted rounded w-32 mb-2" />
                <div className="h-4 bg-muted rounded w-48" />
              </div>
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12">
            <Scissors className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum serviço cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione seus serviços para que clientes possam agendar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-card rounded-2xl p-4 border border-border/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{service.name}</h3>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(service)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {service.duration_minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {formatPrice(Number(service.price))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
