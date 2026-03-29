import { Scissors } from 'lucide-react';

type ServiceImageThumbProps = {
  /** URL pública da foto do serviço (storage) */
  imageUrl?: string | null;
  /** Texto alternativo / nome do serviço para acessibilidade */
  alt: string;
  className?: string;
};

/**
 * Miniatura do serviço: foto enviada pelo profissional ou ícone padrão.
 */
export function ServiceImageThumb({ imageUrl, alt, className = 'h-12 w-12 rounded-xl' }: ServiceImageThumbProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-border/40 bg-primary/10 ${className}`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={alt} className="h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <Scissors className="h-5 w-5 text-primary" aria-hidden />
      )}
    </div>
  );
}
