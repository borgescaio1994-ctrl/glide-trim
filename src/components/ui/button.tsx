import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: ReactNode;
  className?: string;
}

const base =
  'inline-flex items-center justify-center font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none';

const variants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'border border-border bg-transparent hover:bg-muted',
  ghost: 'hover:bg-muted',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
};

const sizes = {
  default: 'h-11 px-4 py-2',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-14 px-6 text-lg',
  icon: 'h-11 w-11',
};

export function buttonVariants({ variant = 'default', size = 'default' }: { variant?: keyof typeof variants; size?: keyof typeof sizes }) {
  return `${base} ${variants[variant]} ${sizes[size]}`;
}

export function Button({
  variant = 'default',
  size = 'default',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
