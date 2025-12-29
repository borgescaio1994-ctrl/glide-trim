import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, LogOut, Settings, Calendar, Clock, Image, Crown } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Você saiu da conta');
    navigate('/auth');
  };

  const getRoleDisplay = () => {
    if (isAdmin) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mt-1">
          <Crown className="w-3 h-3" />
          Dono
        </span>
      );
    }
    if (profile?.role === 'barber') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mt-1">
          Barbeiro
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground mt-1">
        Cliente
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
      </header>

      {/* Profile Card */}
      <div className="px-5 mb-6">
        <div className="bg-card rounded-2xl p-6 border border-border/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <User className="w-10 h-10 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{profile?.full_name}</h2>
              {getRoleDisplay()}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Mail className="w-5 h-5" />
              <span className="text-sm">{profile?.email}</span>
            </div>
            {profile?.phone && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-5 h-5" />
                <span className="text-sm">{profile.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-5 space-y-3">
        {(profile?.role === 'barber' || isAdmin) && (
          <>
            <button
              onClick={() => navigate('/schedule')}
              className="w-full bg-card rounded-xl p-4 flex items-center gap-4 border border-border/50 hover:bg-card/80 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium text-foreground">Horários de Trabalho</h3>
                <p className="text-sm text-muted-foreground">Configure seus dias e horários</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/services')}
              className="w-full bg-card rounded-xl p-4 flex items-center gap-4 border border-border/50 hover:bg-card/80 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium text-foreground">Meus Serviços</h3>
                <p className="text-sm text-muted-foreground">Gerencie seus serviços oferecidos</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/gallery')}
              className="w-full bg-card rounded-xl p-4 flex items-center gap-4 border border-border/50 hover:bg-card/80 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Image className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium text-foreground">Minha Galeria</h3>
                <p className="text-sm text-muted-foreground">Adicione fotos dos seus trabalhos</p>
              </div>
            </button>
          </>
        )}

        <button
          onClick={() => navigate('/appointments')}
          className="w-full bg-card rounded-xl p-4 flex items-center gap-4 border border-border/50 hover:bg-card/80 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-medium text-foreground">Meus Agendamentos</h3>
            <p className="text-sm text-muted-foreground">Veja seu histórico de atendimentos</p>
          </div>
        </button>
      </div>

      {/* Logout Button */}
      <div className="px-5 mt-8">
        <Button
          onClick={handleSignOut}
          variant="outline"
          className="w-full h-12 border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sair da conta
        </Button>
      </div>
    </div>
  );
}
