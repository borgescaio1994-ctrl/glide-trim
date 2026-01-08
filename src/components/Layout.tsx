import { ReactNode, useState, useRef, useEffect } from 'react';
import BottomNav from './BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { MessageCircle } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  const { user } = useAuth();
  usePushNotifications();
  const [position, setPosition] = useState({ x: 24, y: window.innerHeight - 100 }); // Initial position
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const openWhatsApp = () => {
    if (!isDragging) {
      window.open('https://wa.me/5511915605439', '_blank');
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y,
    });
    e.preventDefault();
  };

  const handleMove = (e: MouseEvent | TouchEvent) => {
    if (isDragging) {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const newX = clientX - dragStart.x;
      const newY = clientY - dragStart.y;

      // Constrain to viewport
      const maxX = window.innerWidth - 56; // button width + margin
      const maxY = window.innerHeight - 56; // button height + margin

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('touchmove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchend', handleEnd);
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragStart]);

  return (
    <div className="min-h-screen bg-background">
      <main className={showNav && user ? 'pb-20' : ''}>
        {children}
      </main>
      {showNav && user && <BottomNav />}

      {/* WhatsApp Floating Button */}
      <button
        ref={buttonRef}
        onClick={openWhatsApp}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        className={`fixed w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        aria-label="Abrir WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  );
}
