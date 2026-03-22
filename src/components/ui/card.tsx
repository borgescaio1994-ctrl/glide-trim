import { HTMLAttributes, ReactNode } from 'react';

export function Card({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div className={`rounded-xl border border-border bg-card text-card-foreground shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children }: { className?: string; children?: ReactNode }) {
  return <div className={`flex flex-col space-y-1.5 p-4 ${className}`}>{children}</div>;
}

export function CardContent({ className = '', children }: { className?: string; children?: ReactNode }) {
  return <div className={`p-4 pt-0 ${className}`}>{children}</div>;
}
