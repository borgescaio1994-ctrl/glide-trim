import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Image, Loader2, Scissors } from 'lucide-react';

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
}

export default function Gallery() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchGallery();
    }
  }, [user]);

  const fetchGallery = async () => {
    try {
      const { data, error } = await supabase
        .from('barber_gallery')
        .select('*')
        .eq('barber_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching gallery:', error);
      toast.error('Erro ao carregar galeria');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} não é uma imagem válida`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} é muito grande. Máximo 5MB`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('gallery')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Erro ao fazer upload de ${file.name}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('gallery')
          .getPublicUrl(fileName);

        // Save to database
        const { error: dbError } = await supabase
          .from('barber_gallery')
          .insert({
            barber_id: user?.id,
            image_url: urlData.publicUrl,
          });

        if (dbError) {
          console.error('Database error:', dbError);
          toast.error('Erro ao salvar imagem');
          continue;
        }
      }

      toast.success('Imagens adicionadas com sucesso!');
      fetchGallery();
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Erro ao fazer upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (image: GalleryImage) => {
    try {
      // Extract file path from URL
      const urlParts = image.image_url.split('/gallery/');
      const filePath = urlParts[1];

      // Delete from storage
      if (filePath) {
        await supabase.storage.from('gallery').remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('barber_gallery')
        .delete()
        .eq('id', image.id);

      if (error) throw error;

      toast.success('Imagem removida');
      setImages(images.filter(img => img.id !== image.id));
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Erro ao remover imagem');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-5 pt-12 pb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Scissors className="w-4 h-4 text-primary" />
          </div>
          <span className="text-lg font-semibold text-foreground">BarberPro</span>
        </button>
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Minha Galeria</h1>
            <p className="text-muted-foreground text-sm">
              Adicione fotos dos seus trabalhos
            </p>
          </div>
        </div>
      </header>

      {/* Upload Button */}
      <div className="px-5 mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Fotos
            </>
          )}
        </Button>
      </div>

      {/* Gallery Grid */}
      <div className="px-5">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : images.length === 0 ? (
          <Card className="p-12 text-center">
            <Image className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhuma foto na galeria ainda
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione fotos dos seus melhores trabalhos
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-square rounded-xl overflow-hidden bg-muted">
                  <img
                    src={image.image_url}
                    alt="Trabalho"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8"
                  onClick={() => handleDelete(image)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
