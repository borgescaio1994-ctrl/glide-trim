import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface SimpleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SimpleModal({ open, onOpenChange, title, description, children, className = '' }: SimpleModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={() => onOpenChange(false)} aria-hidden />
      <div
        className={`relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {(title || description) && (
          <div className="mb-4">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
        )}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
