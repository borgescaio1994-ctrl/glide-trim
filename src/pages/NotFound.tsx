import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AppBrandLogo } from '@/components/AppBrandLogo';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.error('404: rota inexistente:', location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted px-6">
      <AppBrandLogo className="h-24 w-24 object-contain" />
      <div className="text-center">
        <h1 className="mb-2 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Página não encontrada</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Voltar ao início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
