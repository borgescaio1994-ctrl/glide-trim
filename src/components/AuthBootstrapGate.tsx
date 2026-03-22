import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Bloqueia a árvore até a primeira resolução da sessão (getSession no bootstrap).
 * Evita redirecionamentos e guards durante o carregamento inicial (F5 seguro).
 */
export default function AuthBootstrapGate({ children }: { children: ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
