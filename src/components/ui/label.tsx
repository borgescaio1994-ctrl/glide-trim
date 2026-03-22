import { LabelHTMLAttributes, ReactNode } from 'react';

export function Label({ className = '', children, ...props }: LabelHTMLAttributes<HTMLLabelElement> & { children?: ReactNode }) {
  return (
    <label className={`text-sm font-medium text-foreground ${className}`} {...props}>
      {children}
    </label>
  );
}
