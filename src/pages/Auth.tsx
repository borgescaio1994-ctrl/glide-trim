import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Scissors, User, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'client' | 'barber'>('client');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message.includes('Invalid login credentials') ? 'Email ou senha incorretos' : error.message);
        } else {
          toast.success('Login realizado com sucesso!');
        }
      } else {
        if (!fullName.trim()) {
          toast.error('Por favor, informe seu nome completo');
          setIsLoading(false);
          return;
        }
        
        const { error } = await signUp(email, password, fullName, role);
        if (error) {
          toast.error(error.message.includes('already registered') ? 'Este email já está cadastrado' : error.message);
        } else {
          toast.success('Conta criada com sucesso!');
        }
      }
    } catch (error) {
      toast.error('Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Scissors className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-semibold text-foreground">BarberPro</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h1>
            <p className="text-muted-foreground">
              {isLogin ? 'Entre para acessar sua conta' : 'Selecione seu perfil e cadastre-se'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label>Eu sou...</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('client')}
                      className={`p-4 rounded-xl border transition-all ${
                        role === 'client' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
                      }`}
                    >
                      <User className="w-6 h-6 mx-auto mb-2" />
                      <span className="text-sm font-medium">Cliente</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('barber')}
                      className={`p-4 rounded-xl border transition-all ${
                        role === 'barber' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
                      }`}
                    >
                      <Scissors className="w-6 h-6 mx-auto mb-2" />
                      <span className="text-sm font-medium">Barbeiro</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="fullName" placeholder="Seu nome" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 h-12 bg-input border-border" />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 h-12 bg-input border-border" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="pl-10 h-12 bg-input border-border" />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{isLogin ? 'Entrar' : 'Finalizar Cadastro'} <ArrowRight className="w-5 h-5 ml-2" /></>}
            </Button>
          </form>

          <div className="text-center mt-4">
            <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {isLogin ? <>Não tem conta? <span className="text-primary font-medium">Cadastre-se</span></> : <>Já tem conta? <span className="text-primary font-medium">Faça login</span></>}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}