import { ReactNode, useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';

export default function SimpleLayout({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });

  const onStart = (e: any) => {
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setRel({ x: clientX - position.x, y: clientY - position.y });
  };

  useEffect(() => {
    const onMove = (e: any) => {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>{children}</main>
      <button
        onMouseDown={onStart} onTouchStart={onStart}
        onClick={() => !isDragging && window.open('https://wa.me/5511915605439', '_blank')}
        className="fixed w-14 h-14 bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center z-[9999] touch-none"
        style={{ left: position.x, top: position.y }}
      >
        <MessageCircle />
      </button>
    </div>
  );
}
