import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const PATH_AUTH = '/auth';

/**
 * Rota protegida F5-safe: spinner enquanto a sessão inicial não foi resolvida;
 * redireciona para /auth só com loading false e user null.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={PATH_AUTH} replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
