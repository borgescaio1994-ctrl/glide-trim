import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export default function AssinaturaPendente() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 text-center space-y-4">
        <div className="flex justify-center">
          <AlertTriangle className="w-12 h-12 text-amber-500" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold">Sistema em Manutenção</h1>
        <p className="text-muted-foreground">
          A assinatura desta loja está pendente. Aguarde a regularização para retomar o acesso.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" onClick={() => navigate('/')}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
          >
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}

