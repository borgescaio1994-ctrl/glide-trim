import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Scissors, User, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, Chrome } from 'lucide-react';

export default function Auth() {
  const [step, setStep] = useState<'select-role' | 'auth'>('select-role');
  const [selectedRole, setSelectedRole] = useState<'client' | 'barber' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error('Erro ao fazer login com Google');
      }
      // Note: OAuth redirect will handle navigation
    } catch (error) {
      toast.error('Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!validateEmail(email)) {
        toast.error('Por favor, informe um email válido');
        setIsLoading(false);
        return;
      }

      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Confirme seu email antes de fazer login. Verifique sua caixa de entrada.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Login realizado com sucesso!');
        navigate('/');
      }
    } catch (error) {
      toast.error('Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Scissors className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-semibold text-foreground">BarberPro</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md animate-fade-in">
          {step === 'select-role' ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Bem-vindo ao BarberPro
                </h1>
                <p className="text-muted-foreground">
                  Escolha seu tipo de conta para continuar
                </p>
              </div>
              <div className="space-y-4">
                <Button
                  onClick={() => {
                    setSelectedRole('client');
                    setStep('auth');
                  }}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl"
                >
                  Sou Cliente
                </Button>
                <Button
                  onClick={() => {
                    setSelectedRole('barber');
                    setStep('auth');
                  }}
                  variant="outline"
                  className="w-full h-12 border-border hover:bg-muted/50 text-foreground font-medium rounded-xl"
                >
                  Sou Barbeiro
                </Button>
              </div>
            </>
          ) : step === 'auth' && selectedRole === 'barber' ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Login do Barbeiro
                </h1>
                <p className="text-muted-foreground">
                  Entre com seu email e senha
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-foreground">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-12 bg-input border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-foreground">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-10 pr-10 h-12 bg-input border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setStep('select-role');
                    setSelectedRole(null);
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Voltar
                </button>
              </div>
            </>
          ) : step === 'auth' && selectedRole === 'client' ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Login do Cliente
                </h1>
                <p className="text-muted-foreground">
                  Escolha como deseja entrar
                </p>
              </div>
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full h-12 border-border hover:bg-muted/50 text-foreground font-medium rounded-xl"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Chrome className="w-5 h-5 mr-3" />
                      Continuar com Google
                    </>
                  )}
                </Button>
              </div>
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setStep('select-role');
                    setSelectedRole(null);
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Voltar
                </button>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
