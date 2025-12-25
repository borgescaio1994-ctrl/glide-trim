import { ReactNode } from 'react';
import BottomNav from './BottomNav';
import { useAuth } from '@/hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <main className={showNav && user ? 'pb-20' : ''}>
        {children}
      </main>
      {showNav && user && <BottomNav />}
    </div>
  );
}
