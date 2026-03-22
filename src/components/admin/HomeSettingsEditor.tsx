import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/contexts/ToastContext';
import { Upload, Save, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface HomeSettings {
  id: string;
  hero_image_url: string | null;
  title: string;
  subtitle: string | null;
}

export default function HomeSettingsEditor() {
  const { success, error: showError } = useToast();
  const { profile } = useAuth();
  const [settings, setSettings] = useState<HomeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, [profile?.establishment_id]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const establishmentId = profile?.establishment_id;
      if (!establishmentId) {
        setSettings(null);
        return;
      }

      const { data, error } = await supabase
        .from('establishments')
        .select('id, hero_image_url, home_title, home_subtitle, name')
        .eq('id', establishmentId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          hero_image_url: (data as any).hero_image_url ?? null,
          title: ((data as any).home_title ?? data.name ?? 'BookNow') as string,
          subtitle: ((data as any).home_subtitle ?? null) as string | null,
        });
      } else {
        setSettings(null);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const establishmentId = profile?.establishment_id;
    if (!establishmentId) return;

    if (!file.type.startsWith('image/')) {
      showError('Por favor, selecione uma imagem');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${establishmentId}/hero-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('home-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('home-assets')
        .getPublicUrl(fileName);

      setSettings(prev => prev ? { ...prev, hero_image_url: publicUrl } : null);
      success('Imagem carregada!');
    } catch (error: any) {
      console.error('Error uploading:', error);
      showError(error?.message || 'Erro ao carregar imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('establishments')
        .update({
          hero_image_url: settings.hero_image_url,
          home_title: settings.title,
          home_subtitle: settings.subtitle,
        } as any)
        .eq('id', settings.id);

      if (error) throw error;
      success('Configurações salvas!');
    } catch (error: any) {
      console.error('Error saving:', error);
      const msg = String(error?.message || error || '');
      if (msg.includes('permission denied') || msg.includes('42501') || msg.includes('policy')) {
        showError(
          'Sem permissão para salvar. Confirme: assinatura da loja ativa (subscription_status), conta como dono (ADMIN_BARBER) e unidade vinculada.'
        );
      } else {
        showError(msg || 'Erro ao salvar configurações');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border/50 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4" />
        <div className="h-40 bg-muted rounded mb-4" />
        <div className="h-10 bg-muted rounded mb-3" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  if (!profile?.establishment_id) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border/50 text-sm text-muted-foreground">
        Sua conta não está vinculada a uma unidade (establishment). O super admin precisa associar seu usuário a uma loja para editar título, descrição e imagem da página inicial.
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border/50 text-sm text-muted-foreground">
        Não foi possível carregar os dados da unidade. Verifique se a assinatura está ativa e tente novamente.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-border/50 space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <ImageIcon className="w-5 h-5 text-primary" />
        Configurações da Página Inicial
      </h3>

      {/* Image Upload */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">Imagem Principal</label>
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="relative w-full h-48 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer overflow-hidden bg-muted/30"
        >
          {settings?.hero_image_url ? (
            <img 
              src={settings.hero_image_url} 
              alt="Hero" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clique para carregar imagem</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Title */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">Título</label>
        <Input
          value={settings?.title || ''}
          onChange={(e) => setSettings(prev => prev ? { ...prev, title: e.target.value } : null)}
          placeholder="Nome da loja"
          className="bg-background"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">Subtítulo</label>
        <Textarea
          value={settings?.subtitle || ''}
          onChange={(e) => setSettings(prev => prev ? { ...prev, subtitle: e.target.value } : null)}
          placeholder="Descrição ou slogan"
          rows={3}
          className="bg-background resize-none"
        />
      </div>

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        disabled={saving}
        className="w-full"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        Salvar Alterações
      </Button>
    </div>
  );
}
