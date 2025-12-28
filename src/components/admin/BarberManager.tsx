import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserPlus, Trash2, Loader2, Scissors, Mail, Phone } from 'lucide-react';
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

interface RegisteredBarber {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export default function BarberManager() {
  const [barbers, setBarbers] = useState<RegisteredBarber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('registered_barbers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBarbers(data || []);
    } catch (error: any) {
      console.error('Error fetching barbers:', error);
      toast.error('Erro ao carregar barbeiros');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim() || !email.trim()) {
      toast.error('Nome e email são obrigatórios');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('registered_barbers')
        .insert({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
        });

      if (error) {
        if (error.message.includes('duplicate key') || error.message.includes('unique')) {
          toast.error('Este email já está cadastrado');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Barbeiro cadastrado com sucesso!');
      setFullName('');
      setEmail('');
      setPhone('');
      fetchBarbers();
    } catch (error: any) {
      console.error('Error adding barber:', error);
      toast.error('Erro ao cadastrar barbeiro');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBarber = async (id: string) => {
    try {
      const { error } = await supabase
        .from('registered_barbers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Barbeiro removido');
      fetchBarbers();
    } catch (error: any) {
      console.error('Error deleting barber:', error);
      toast.error('Erro ao remover barbeiro');
    }
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
      setPhone(formatted);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Barber Form */}
      <form onSubmit={handleAddBarber} className="bg-card rounded-xl border border-border p-4 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Adicionar Novo Barbeiro
        </h3>
        
        <p className="text-sm text-muted-foreground">
          Apenas emails cadastrados aqui poderão se registrar como barbeiros no sistema.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="barber-name">Nome completo *</Label>
            <Input
              id="barber-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome do barbeiro"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="barber-email">Email *</Label>
            <Input
              id="barber-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="barber-phone">Telefone</Label>
            <Input
              id="barber-phone"
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <UserPlus className="w-4 h-4 mr-2" />
          )}
          Cadastrar Barbeiro
        </Button>
      </form>

      {/* Barbers List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Barbeiros Cadastrados</h3>
        
        {barbers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border border-border">
            <Scissors className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum barbeiro cadastrado ainda</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {barbers.map((barber) => (
              <div
                key={barber.id}
                className="flex items-center justify-between p-4 bg-card rounded-xl border border-border"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Scissors className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{barber.full_name}</h4>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {barber.email}
                      </span>
                      {barber.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {barber.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover barbeiro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso removerá {barber.full_name} da lista de barbeiros autorizados. 
                        Se ele já criou uma conta, a conta continuará existindo mas ele não poderá 
                        criar novas contas de barbeiro.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteBarber(barber.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
