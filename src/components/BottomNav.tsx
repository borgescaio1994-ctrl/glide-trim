import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, User, BarChart3, Crown, Building2, Scissors } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const clientNavItems = [
  { icon: Home, label: 'Início', path: '/' },
  { icon: Calendar, label: 'Agendamentos', path: '/appointments' },
  { icon: User, label: 'Perfil', path: '/profile' },
];

const barberNavItems = [
  { icon: Home, label: 'Agenda', path: '/barber' },
  { icon: Calendar, label: 'Horários', path: '/schedule' },
  { icon: BarChart3, label: 'Financeiro', path: '/finances' },
  { icon: Calendar, label: 'Serviços', path: '/services' },
  { icon: User, label: 'Perfil', path: '/profile' },
];

// SUPER_ADMIN: apenas Gestão de Lojas (não vê agenda, profissionais, serviços)
const superAdminNavItems = [
  { icon: Building2, label: 'Gestão de Lojas', path: '/super-admin' },
  { icon: User, label: 'Perfil', path: '/profile' },
];

// ADMIN_BARBER: menu completo de gestão + agenda (igual profissional + painel)
const adminBarberNavItems = [
  { icon: Home, label: 'Início', path: '/' },
  { icon: Crown, label: 'Painel', path: '/admin' },
  { icon: Calendar, label: 'Horários', path: '/schedule' },
  { icon: BarChart3, label: 'Financeiro', path: '/finances' },
  { icon: Scissors, label: 'Serviços', path: '/services' },
  { icon: User, label: 'Perfil', path: '/profile' },
];

// Dono que não atua como barbeiro na vitrine: só painel + perfil
const adminBarberNavItemsAdminOnly = [
  { icon: Crown, label: 'Painel', path: '/admin' },
  { icon: User, label: 'Perfil', path: '/profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isSuperAdmin } = useAuth();

  const isBarberLike =
    profile?.profile_role === 'BARBER' ||
    profile?.profile_role === 'ADMIN_BARBER' ||
    profile?.role === 'barber';

  const ownerAdminNoBarberVitrine =
    profile?.profile_role === 'ADMIN_BARBER' && profile.visible_on_client_home === false;

  const navItems =
    isSuperAdmin
      ? superAdminNavItems
      : ownerAdminNoBarberVitrine
        ? adminBarberNavItemsAdminOnly
        : profile?.profile_role === 'ADMIN_BARBER'
          ? adminBarberNavItems
          : isBarberLike
            ? barberNavItems
            : clientNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive =
            item.path === '/barber'
              ? location.pathname === '/barber'
              : location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon
                className={`w-5 h-5 mb-1 transition-transform duration-200 ${
                  isActive ? 'scale-110' : ''
                }`}
              />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
