import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Camera, Upload, LogOut, Check, Settings, Calendar, Image, Crown, User, Mail, Phone, AlertCircle, Clock, CheckCircle, Edit, RefreshCw, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Profile() {
  const { profile, isAdmin, signOut, user, fetchProfile } = useAuth();
  const navigate = useNavigate();
  
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [updatingPhone, setUpdatingPhone] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    toast.success('Saiu com sucesso');
  };

  const formatPhone = (phone: string | null | undefined) => {
    if (!phone || typeof phone !== 'string') return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  useEffect(() => {
    if (user) {
      fetchProfile(user.id).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, fetchProfile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !user) return;

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await fetchProfile(user.id);
      toast.success('Foto atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao atualizar foto.');
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyPhone = async () => {
    setUpdatingPhone(true);
    try {
      const digits = newPhone.replace(/\D/g, '');
      if (digits.length !== 11) {
        toast.error('Telefone inválido');
        return;
      }

      localStorage.setItem('pending_phone', digits);
      setEditingPhone(false);
      
      navigate('/verify-phone');
    } catch (error) {
      console.error('Erro ao preparar telefone:', error);
      toast.error('Erro ao salvar telefone');
    } finally {
      setUpdatingPhone(false);
    }
  };

  const handleRemovePhone = async () => {
    if (!user) return;
    
    setUpdatingPhone(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          phone: '',
          phone_number: null,
          whatsapp_number: null,
          is_verified: false,
          phone_verified: false 
        })
        .eq('id', user.id);

      if (!error) {
        await fetchProfile(user.id);
        toast.success('Telefone removido com sucesso!');
      } else {
        console.error('Erro ao remover telefone:', error);
        toast.error('Erro ao remover telefone');
      }
    } catch (error) {
      console.error('Erro ao remover telefone:', error);
      toast.error('Erro ao remover telefone');
    } finally {
      setUpdatingPhone(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Faça login para ver seu perfil</p>
          <Button onClick={() => navigate('/auth')}>Fazer Login</Button>
        </div>
      </div>
    );
  }

  const hasPhone = (profile?.phone && profile.phone.trim() !== '') || 
                  (profile as any)?.phone_number || 
                  (profile as any)?.whatsapp_number;

  const phoneDisplay = formatPhone(profile?.phone || (profile as any)?.phone_number || (profile as any)?.whatsapp_number);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Avatar Section */}
        <div className="bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                size="sm"
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Camera className="w-3 h-3" />
                )}
              </Button>
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{profile?.full_name || 'Carregando...'}</h2>
              <p className="text-muted-foreground">{profile?.email}</p>
              {isAdmin && (
                <div className="flex items-center gap-1 mt-1">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-yellow-500">Administrador</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Phone Section */}
        <div className="bg-card rounded-xl p-6 shadow-sm">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Telefone</h3>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-primary" />
              <div className="flex flex-col">
                {editingPhone ? (
                  <Input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="h-8 w-40 text-sm"
                    placeholder="DDD + Número"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    {phoneDisplay ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          (profile?.is_verified || profile?.phone_verified) 
                            ? 'text-green-600' 
                            : 'text-foreground'
                        }`}>
                          {phoneDisplay}
                        </span>
                        {(profile?.is_verified || profile?.phone_verified) && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-700">Verificado</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Não adicionado</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-3">
            {editingPhone ? (
              <>
                <Button
                  size="sm"
                  onClick={handleVerifyPhone}
                  disabled={updatingPhone}
                  className="h-8 px-3"
                >
                  {updatingPhone ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  Verificar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingPhone(false);
                    setNewPhone('');
                  }}
                  className="h-8 px-3"
                >
                  Cancelar
                </Button>
              </>
            ) : (
              !hasPhone ? (
                <Button
                  size="sm"
                  onClick={() => navigate('/verify-phone')}
                  className="h-8 px-3"
                >
                  Adicionar
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingPhone(true);
                      setNewPhone(phoneDisplay || '');
                    }}
                    className="h-8 px-3"
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleRemovePhone}
                    disabled={updatingPhone}
                    className="h-8 px-3 bg-red-600 hover:bg-red-700"
                  >
                    {updatingPhone ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                    Excluir
                  </Button>
                </>
              )
            )}
          </div>
        </div>

        {/* Appointments Button */}
        <div className="px-5 space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => navigate('/appointments')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Meus Agendamentos
          </Button>
        </div>
      </div>
    </div>
  );
}
