import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, User, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const clientNavItems = [
  { icon: Home, label: 'Início', path: '/' },
  { icon: Calendar, label: 'Agendamentos', path: '/appointments' },
  { icon: User, label: 'Perfil', path: '/profile' },
];

const barberNavItems = [
  { icon: Home, label: 'Agenda', path: '/' },
  { icon: BarChart3, label: 'Financeiro', path: '/finances' },
  { icon: Calendar, label: 'Serviços', path: '/services' },
  { icon: User, label: 'Perfil', path: '/profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const navItems = profile?.role === 'barber' ? barberNavItems : clientNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
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
