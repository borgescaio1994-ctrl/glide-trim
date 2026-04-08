import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Scissors, Clock, DollarSign, ChevronRight, Calendar, Image, Camera } from 'lucide-react';
import { ServiceImageThumb } from '@/components/ServiceImageThumb';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Barber {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  establishment_id?: string | null;
  visible_on_client_home?: boolean | null;
  profile_role?: string;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  image_url: string | null;
}

interface Schedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
}

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Número internacional só com dígitos (ex.: 5511999998888) para wa.me */
function toWhatsAppDigits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, '');
  if (!d) return null;
  // Brasil: DDD + número sem código do país
  if (!d.startsWith('55') && d.length >= 10 && d.length <= 11) {
    d = `55${d}`;
  }
  if (d.length < 10) return null;
  return d;
}

function buildWhatsAppUrl(phoneDigits: string, barberName: string): string {
  const text = encodeURIComponent(
    `Olá! Vim pelo app e gostaria de falar sobre os serviços${barberName ? ` (${barberName})` : ''}.`
  );
  return `https://wa.me/${phoneDigits}?text=${text}`;
}

export default function BarberProfile() {
  const { barberId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setWhatsappUrl(null);
    try {
      const { data: barberData, error: barberErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', barberId)
        .maybeSingle();

      if (barberErr || !barberData) {
        navigate('/', { replace: true });
        return;
      }

      const visible = barberData.visible_on_client_home !== false;
      const estId = barberData.establishment_id as string | null | undefined;
      const isStaff =
        !!profile &&
        (profile.profile_role === 'SUPER_ADMIN' ||
          (!!estId &&
            profile.establishment_id === estId &&
            (profile.profile_role === 'ADMIN_BARBER' || profile.profile_role === 'BARBER')));

      if (!visible && !isStaff) {
        navigate('/', { replace: true });
        return;
      }

      setBarber(barberData as Barber);

      // Fetch services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('barber_id', barberId)
        .eq('is_active', true);

      if (servicesData) {
        setServices(servicesData);
      }

      // Fetch schedules
      const { data: schedulesData } = await supabase
        .from('barber_schedules')
        .select('*')
        .eq('barber_id', barberId)
        .eq('is_active', true)
        .order('day_of_week');

      if (schedulesData) {
        setSchedules(schedulesData);
      }

      // Fetch gallery images
      const { data: galleryData } = await supabase
        .from('barber_gallery')
        .select('*')
        .eq('barber_id', barberId)
        .order('created_at', { ascending: false });

      if (galleryData) {
        setGalleryImages(galleryData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [barberId, navigate, profile]);

  useEffect(() => {
    if (barberId) {
      void fetchData();
    }
  }, [barberId, fetchData]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const isOwnProfile = profile?.id === barberId && profile?.role === 'barber';

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !barberId) return;
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const fileName = `${barberId}/avatar-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', barberId);
      if (updateError) throw updateError;
      setBarber(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
    } catch (err) {
      console.error('Erro ao enviar foto:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Profissional não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-12 pb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-muted rounded-lg transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        {/* Profile Card */}
        <div className="bg-card rounded-2xl p-6 border border-border/50">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
              {barber.avatar_url ? (
                <img
                  src={barber.avatar_url}
                  alt={barber.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Scissors className="w-10 h-10 text-primary" />
              )}
              {isOwnProfile && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFile}
                    disabled={uploading}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-2xl disabled:opacity-50"
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                  </button>
                </>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{barber.full_name}</h1>
              <p className="text-sm text-muted-foreground">Profissional</p>
            </div>
          </div>
        </div>
      </header>

      {/* Schedule */}
      <div className="px-5 mb-6">
        <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Horários de atendimento
        </h2>
        
        {schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum horário definido</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {schedules.map((schedule) => (
              <div
                key={schedule.day_of_week}
                className="bg-card rounded-xl px-3 py-2 border border-border/50"
              >
                <p className="text-xs font-medium text-foreground">
                  {DAYS_OF_WEEK[schedule.day_of_week]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Services */}
      <div className="px-5 pb-6">
        <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Scissors className="w-4 h-4 text-primary" />
          Serviços
        </h2>

        {services.length === 0 ? (
          <div className="text-center py-8">
            <Scissors className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Nenhum serviço disponível</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => navigate(`/book/${barberId}/${service.id}`)}
                className="w-full bg-card rounded-2xl p-4 flex items-center gap-4 group hover:bg-card/80 transition-colors border border-border/50"
              >
                <ServiceImageThumb
                  imageUrl={service.image_url}
                  alt={service.name}
                  className="h-12 w-12 rounded-xl"
                />
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-foreground">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {service.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {service.duration_minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      {formatPrice(Number(service.price))}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Gallery */}
      {galleryImages.length > 0 && (
        <div className="px-5 pb-8">
          <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Image className="w-4 h-4 text-primary" />
            Galeria de Trabalhos
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {galleryImages.map((image) => (
              <button
                key={image.id}
                onClick={() => setSelectedImage(image.image_url)}
                className="aspect-square rounded-xl overflow-hidden bg-muted hover:opacity-90 transition-opacity"
              >
                <img
                  src={image.image_url}
                  alt="Trabalho do profissional"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Trabalho do profissional"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}

      {/* WhatsApp flutuante: número do estabelecimento (dono) ou fallback do perfil */}
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
          aria-label="Conversar no WhatsApp"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-8 w-8"
            aria-hidden
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      )}

    </div>
  );
}
