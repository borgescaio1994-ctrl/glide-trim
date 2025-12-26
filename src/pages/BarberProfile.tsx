import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Scissors, Clock, DollarSign, ChevronRight, Calendar, Image } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface Barber {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
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

export default function BarberProfile() {
  const { barberId } = useParams();
  const navigate = useNavigate();
  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (barberId) {
      fetchData();
    }
  }, [barberId]);

  useEffect(() => {
    if (barberId) {
      fetchData();
    }
  }, [barberId]);

  const fetchData = async () => {
    try {
      // Fetch barber profile
      const { data: barberData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', barberId)
        .single();

      if (barberData) {
        setBarber(barberData);
      }

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
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
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
        <p className="text-muted-foreground">Barbeiro não encontrado</p>
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
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
              {barber.avatar_url ? (
                <img
                  src={barber.avatar_url}
                  alt={barber.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Scissors className="w-10 h-10 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{barber.full_name}</h1>
              <p className="text-sm text-muted-foreground">Barbeiro profissional</p>
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
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Scissors className="w-5 h-5 text-primary" />
                </div>
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
                  alt="Trabalho do barbeiro"
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
            alt="Trabalho do barbeiro"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
