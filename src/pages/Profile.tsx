import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/contexts/ToastContext';
import { Camera, Upload, LogOut, Check, Settings, Calendar, Image, Crown, User, Mail, Phone, AlertCircle, Clock, CheckCircle, Edit, RefreshCw, Loader2, Trash2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Profile() {
  const { profile, isAdmin, signOut, user, fetchProfile } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [updatingPhone, setUpdatingPhone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    success('Saiu com sucesso');
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

  useEffect(() => {
    if (profile?.full_name != null) setNameDraft(profile.full_name);
  }, [profile?.full_name]);

  const handleSaveName = async () => {
    if (!user) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      showError('Informe um nome');
      return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: trimmed })
        .eq('id', user.id);
      if (error) throw error;
      await fetchProfile(user.id);
      setEditingName(false);
      success('Nome atualizado!');
    } catch (e) {
      console.error(e);
      showError(e instanceof Error ? e.message : 'Erro ao salvar nome');
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !user) return;

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    setUploading(true);
    try {
      // Verificar tipo e tamanho do arquivo
      if (!file.type.startsWith('image/')) {
        showError('Apenas arquivos de imagem são permitidos');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB
        showError('A imagem deve ter no máximo 5MB');
        return;
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        if (import.meta.env.DEV) console.error('Avatar upload:', uploadError);
        
        // Tratamento específico para diferentes tipos de erro
        if (uploadError.message.includes('bucket not found')) {
          showError('Bucket de avatares não encontrado. Contate o suporte.');
        } else if (uploadError.message.includes('permission denied')) {
          showError('Sem permissão para fazer upload. Verifique as configurações.');
        } else if (uploadError.message.includes('file too large')) {
          showError('Arquivo muito grande. Máximo permitido: 5MB.');
        } else if (uploadError.message.includes('invalid mime type')) {
          showError('Tipo de arquivo inválido. Apenas imagens são permitidas.');
        } else {
          showError(`Erro no upload: ${uploadError.message}`);
        }
        return;
      }

      const { data: { publicUrl } } = await supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!publicUrl) {
        showError('Erro ao obter URL pública da imagem');
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar perfil:', updateError);
        
        // Tratamento específico para diferentes tipos de erro
        if (updateError.message.includes('permission denied') || updateError.message.includes('insufficient privilege')) {
          showError('Sem permissão para atualizar o avatar. Verifique as políticas de acesso.');
        } else if (updateError.message.includes('column "avatar_url" does not exist') || updateError.message.includes('column does not exist')) {
          showError('Coluna de avatar não encontrada. Contate o suporte.');
        } else if (updateError.message.includes('null value in column "avatar_url" violates not-null constraint')) {
          showError('Erro de validação. Tente fazer upload novamente.');
        } else if (updateError.message.includes('duplicate key value violates unique constraint')) {
          showError('Já existe um avatar para este perfil. Tente outra imagem.');
        } else if (updateError.message.includes('timeout')) {
          showError('Tempo esgotado. Tente novamente com uma conexão melhor.');
        } else if (updateError.message.includes('connection')) {
          showError('Erro de conexão. Verifique sua internet e tente novamente.');
        } else {
          showError(`Erro ao atualizar avatar: ${updateError.message}`);
        }
        return;
      }

      await fetchProfile(user.id);
      success('Foto atualizada com sucesso!');
    } catch (error) {
      console.error('❌ Erro geral no upload:', error);
      showError('Ocorreu um erro ao fazer upload da foto. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyPhone = async () => {
    setUpdatingPhone(true);
    try {
      const digits = newPhone.replace(/\D/g, '');
      if (digits.length !== 11) {
        showError('Telefone inválido');
        return;
      }

      localStorage.setItem('pending_phone', digits);
      setEditingPhone(false);
      
      navigate('/verify-phone');
    } catch (error) {
      console.error('Erro ao preparar telefone:', error);
      showError('Erro ao salvar telefone');
    } finally {
      setUpdatingPhone(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      showError('Conta sem e-mail: alteração de senha não disponível neste fluxo.');
      return;
    }
    if (!currentPassword || !newPassword) {
      showError('Preencha a senha atual e a nova senha');
      return;
    }
    if (newPassword.length < 6) {
      showError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('A confirmação da nova senha não confere');
      return;
    }
    setSavingPassword(true);
    try {
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthErr) {
        showError('Senha atual incorreta');
        return;
      }
      const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updErr) throw updErr;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      success('Senha alterada com sucesso');
    } catch (e) {
      console.error(e);
      showError(e instanceof Error ? e.message : 'Erro ao alterar senha');
    } finally {
      setSavingPassword(false);
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
        success('Telefone removido com sucesso!');
      } else {
        console.error('Erro ao remover telefone:', error);
        showError('Erro ao remover telefone');
      }
    } catch (error) {
      console.error('Erro ao remover telefone:', error);
      showError('Erro ao remover telefone');
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
                  profile?.phone_number || 
                  profile?.whatsapp_number;

  const phoneDisplay = formatPhone(profile?.phone || profile?.phone_number || profile?.whatsapp_number);

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
            
            <div className="flex-1 space-y-2">
              {editingName ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    className="max-w-xs"
                    placeholder="Seu nome"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveName} disabled={savingName}>
                      {savingName ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingName(false);
                        setNameDraft(profile?.full_name || '');
                      }}
                      disabled={savingName}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-semibold">{profile?.full_name || 'Carregando...'}</h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={() => {
                      setNameDraft(profile?.full_name || '');
                      setEditingName(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <p className="text-muted-foreground">{profile?.email}</p>
              <div className="flex items-center gap-1 mt-1">
                {isAdmin && (
                  <>
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-yellow-500">Administrador</span>
                  </>
                ) || profile?.role === 'barber' && (
                  <>
                    <Settings className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-blue-500">Profissional</span>
                  </>
                ) || profile?.role === 'client' && (
                  <>
                    <User className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500">Cliente</span>
                  </>
                ) || (
                  <>
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Usuário</span>
                  </>
                )}
              </div>
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

        {/* Senha de login */}
        <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Alterar senha de login</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Informe a senha atual e escolha uma nova senha. Ela vale para o próximo acesso no app.
          </p>
          <div className="space-y-3 max-w-md">
            <div>
              <Label htmlFor="current-password">Senha atual</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleChangePassword} disabled={savingPassword} className="w-full sm:w-auto">
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar nova senha
            </Button>
          </div>
        </div>

        {/* Appointments Button (hide for SUPER_ADMIN) */}
        {profile?.profile_role !== 'SUPER_ADMIN' && (
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
        )}
      </div>
    </div>
  );
}
