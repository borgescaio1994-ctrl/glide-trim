import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Phone, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Profile() {
  const { profile, user, signOut, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [updatingPhone, setUpdatingPhone] = useState(false);

  const handleEditPhone = () => {
    if (profile?.phone) {
      setNewPhone(profile.phone);
      setEditingPhone(true);
    }
  };

  const handleRemovePhone = async () => {
    if (!user) return;
    
    setUpdatingPhone(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          phone: null, 
          phone_number: null, 
          whatsapp_number: null,
          phone_verified: false,
          is_verified: false 
        })
        .eq("id", user.id);

      if (!error) {
        toast.success("Telefone removido com sucesso!");
        await fetchProfile(user.id);
        setEditingPhone(false);
      } else {
        toast.error("Erro ao remover telefone");
      }
    } catch (error) {
      toast.error("Erro ao remover telefone");
    } finally {
      setUpdatingPhone(false);
    }
  };

  const handleSavePhone = async () => {
    if (!user || !newPhone) return;
    
    setUpdatingPhone(true);
    try {
      const digits = newPhone.replace(/\D/g, '');
      const fullPhone = digits.length === 11 ? `55${digits}` : digits;

      const { error } = await supabase
        .from("profiles")
        .update({ 
          phone: fullPhone, 
          phone_number: fullPhone, 
          whatsapp_number: fullPhone,
          phone_verified: true,
          is_verified: true 
        })
        .eq("id", user.id);

      if (!error) {
        toast.success("Telefone atualizado com sucesso!");
        await fetchProfile(user.id);
        setEditingPhone(false);
        setNewPhone("");
      } else {
        toast.error("Erro ao salvar telefone");
      }
    } catch (error) {
      toast.error("Erro ao salvar telefone");
    } finally {
      setUpdatingPhone(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
    toast.success("Saiu com sucesso");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Meu Perfil</h1>

        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6">
          {/* Avatar e Nome */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {profile?.full_name || "Usuário"}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            {/* Telefone / WhatsApp */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">WhatsApp</p>
                  <p className="font-medium">
                    {/* Evita o erro de objeto: Acessamos a string .phone */}
                    {profile?.phone || "Não cadastrado"}
                  </p>
                </div>
              </div>
              {profile?.is_verified && (
                <div className="flex items-center gap-1 bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-xs font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  Verificado
                </div>
              )}
            </div>
          </div>

          {/* BOTÕES: Só aparecem se o perfil estiver verificado e o objeto existir */}
          {profile?.is_verified && (
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={handleEditPhone}
              >
                <Pencil className="w-4 h-4" /> Editar
              </Button>
              <Button 
                variant="destructive" 
                className="flex items-center gap-2"
                onClick={handleRemovePhone}
                disabled={updatingPhone}
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </Button>
            </div>
          )}

          {/* FORMulário DE EDIÇÃO */}
          {editingPhone && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone</label>
                <input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSavePhone}
                  disabled={updatingPhone}
                  className="flex-1"
                >
                  {updatingPhone ? "Salvando..." : "Salvar"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setEditingPhone(false);
                    setNewPhone("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        <Button 
          variant="ghost" 
          className="w-full text-destructive hover:bg-destructive/10" 
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" /> Sair da conta
        </Button>
      </div>
    </div>
  );
}