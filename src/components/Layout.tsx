import { ReactNode, useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useEstablishment } from '@/hooks/useEstablishment';
import { whatsAppMeUrl } from '@/lib/utils';
import { MessageCircle } from 'lucide-react';

export default function Layout({ children, showNav = true }: { children: ReactNode, showNav?: boolean }) {
  const { user } = useAuth();
  const { establishmentDisplayName, establishment } = useEstablishment();
  const whatsappUrl = useMemo(
    () => whatsAppMeUrl(establishment?.whatsapp_sender_phone ?? null),
    [establishment?.whatsapp_sender_phone]
  );
  const location = useLocation();
  const hideFloatingButton =
    location.pathname === '/verify-phone' || location.pathname === '/auth' || !whatsappUrl;
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const didMoveRef = useRef(false);

  const onStart = (e: React.MouseEvent | React.TouchEvent) => {
    didMoveRef.current = false;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setRel({ x: clientX - position.x, y: clientY - position.y });
  };

  useEffect(() => {
    document.title = establishmentDisplayName || 'BookNow';
  }, [establishmentDisplayName]);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      didMoveRef.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setPosition({
        x: Math.max(10, Math.min(clientX - rel.x, window.innerWidth - 70)),
        y: Math.max(10, Math.min(clientY - rel.y, window.innerHeight - 80))
      });
    };
    const onEnd = () => setTimeout(() => setIsDragging(false), 50);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, rel]);

  const openWhatsApp = () => {
    if (didMoveRef.current || !whatsappUrl) return;
    const w = window.open(whatsappUrl, '_blank');
    if (!w || w.closed) window.location.href = whatsappUrl;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className={showNav && user ? 'pb-20' : ''}>{children}</main>
      {showNav && user && <BottomNav />}
      {!hideFloatingButton && (
      <button
        type="button"
        onMouseDown={onStart}
        onTouchStart={onStart}
        onClick={openWhatsApp}
        className="fixed w-14 h-14 bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center z-[9999] touch-none"
        style={{ left: position.x, top: position.y }}
      >
        <MessageCircle />
      </button>
      )}
    </div>
  );
}