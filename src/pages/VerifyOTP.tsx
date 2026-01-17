import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { validateAuthCode } from '@/lib/authUtils';
import { supabase } from '@/integrations/supabase/client';

interface LocationState {
  phone: string;
  userId: string;
}

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  // Se não tiver state, redirecionar
  if (!state?.phone || !state?.userId) {
    navigate('/auth');
    return null;
  }

  const handleConfirm = async () => {
    if (code.length !== 6) {
      setError('Digite um código de 6 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isValid = await validateAuthCode(state.phone, code);

      if (isValid) {
        toast.success('Verificação realizada com sucesso!');
        navigate('/'); // rota principal
      } else {
        setError('Código incorreto ou expirado. Tente novamente.');
      }
    } catch (err) {
      console.error('Erro na verificação:', err);
      setError('Erro ao verificar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setError('');

    try {
      // Chamar webhook n8n para reenviar código
      // Substitua pela URL do seu webhook n8n (Production ou Test URL do nó Webhook)
      const webhookUrl = 'http://localhost:5678/webhook/webhook-test/whatsapp'; // Ajuste para sua URL real

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: state.phone,
          user_id: state.userId,
          action: 'start_verification',
        }),
      });

      if (response.ok) {
        toast.success('Código reenviado com sucesso!');
      } else {
        throw new Error('Erro ao reenviar código');
      }
    } catch (err) {
      console.error('Erro ao reenviar código:', err);
      setError('Erro ao reenviar código. Tente novamente.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-lg transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Verificar Telefone</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Digite o código de 6 dígitos enviado para {state.phone}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Código de Verificação</Label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center text-2xl tracking-widest mt-1"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <Button
            onClick={handleConfirm}
            disabled={loading || code.length !== 6}
            className="w-full h-12 bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Confirmar'
            )}
          </Button>

          <Button
            onClick={handleResendCode}
            disabled={resending}
            variant="outline"
            className="w-full"
          >
            {resending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Reenviar Código
          </Button>
        </div>
      </div>
    </div>
  );
}