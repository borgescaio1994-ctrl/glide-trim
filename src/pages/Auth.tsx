import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEstablishment } from '@/hooks/useEstablishment';
import { supabase } from '@/integrations/supabase/client';
import type { ProfileRole } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/contexts/ToastContext';
import { Scissors, User, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

/** Aguarda o trigger handle_new_user popular `profiles` após signUp/signIn. */
async function waitForProfileRole(userId: string): Promise<ProfileRole | null> {
  for (let i = 0; i < 8; i++) {
    const { data } = await supabase
      .from('profiles')
      .select('profile_role')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      const pr = (data as { profile_role?: ProfileRole | null }).profile_role;
      if (pr != null && pr !== '') return pr;
      return 'CUSTOMER';
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  return null;
}

/**
 * Garante que a aba (cliente vs profissional) bate com o perfil no banco.
 */
async function assertLoginMatchesRoleTab(
  tab: 'client' | 'barber'
): Promise<{ ok: true } | { ok: false; message: string }> {
  const {
    data: { user: u },
  } = await supabase.auth.getUser();
  if (!u) {
    return { ok: false, message: 'Sessão inválida. Tente novamente.' };
  }

  const pr = await waitForProfileRole(u.id);
  if (!pr) {
    await supabase.auth.signOut();
    return {
      ok: false,
      message: 'Não foi possível carregar seu perfil. Tente de novo em instantes.',
    };
  }

  if (tab === 'barber') {
    if (pr !== 'BARBER' && pr !== 'ADMIN_BARBER') {
      await supabase.auth.signOut();
      return {
        ok: false,
        message:
          'Este email não está cadastrado como profissional. O dono da loja precisa adicionar você no painel antes do login.',
      };
    }
    return { ok: true };
  }

  if (pr === 'BARBER' || pr === 'ADMIN_BARBER') {
    await supabase.auth.signOut();
    return {
      ok: false,
      message: 'Esta conta é de profissional. Use a opção "Sou profissional" para entrar.',
    };
  }
  if (pr === 'SUPER_ADMIN') {
    await supabase.auth.signOut();
    return { ok: false, message: 'Acesse pelo fluxo de super administrador.' };
  }

  return { ok: true };
}

/** Cliente: mesma loja do domínio/slug atual (ou vincula na primeira vez se ainda não tiver loja). */
async function assertCustomerSameEstablishment(
  establishmentId: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const {
    data: { user: u },
  } = await supabase.auth.getUser();
  if (!u) {
    return { ok: false, message: 'Sessão inválida. Tente novamente.' };
  }

  const { data: row } = await supabase
    .from('profiles')
    .select('establishment_id, profile_role')
    .eq('id', u.id)
    .maybeSingle();

  if (!row || row.profile_role !== 'CUSTOMER') {
    return { ok: true };
  }

  if (!establishmentId) {
    return { ok: true };
  }

  const pid = (row as { establishment_id?: string | null }).establishment_id ?? null;
  if (!pid) {
    const { error } = await supabase
      .from('profiles')
      .update({ establishment_id: establishmentId })
      .eq('id', u.id);
    if (error) {
      return { ok: false, message: 'Não foi possível vincular sua conta a esta loja.' };
    }
    return { ok: true };
  }

  if (pid !== establishmentId) {
    await supabase.auth.signOut();
    return {
      ok: false,
      message:
        'Esta conta é de outra unidade. Entre pelo link ou site da loja onde você se cadastrou.',
    };
  }

  return { ok: true };
}

export default function Auth() {
  const [step, setStep] = useState<'select-role' | 'auth' | 'signup'>('select-role');
  const [selectedRole, setSelectedRole] = useState<'client' | 'barber' | null>(null);
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, user, loading: authLoading, fetchProfile } = useAuth();
  const { establishmentDisplayName, establishmentId, loading: establishmentLoading } = useEstablishment();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  /** Evita useEffect redirecionar para / antes da validação cliente/profissional após signIn. */
  const skipAutoRedirectRef = useRef(false);

  // Já logado abrindo /auth: vai para home (sem passar pelo formulário)
  useEffect(() => {
    if (authLoading) return;
    if (!user || skipAutoRedirectRef.current) return;
    navigate('/', { replace: true });
  }, [user, authLoading, navigate]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    skipAutoRedirectRef.current = true;
    let deferSkipResetForVerifyPhone = false;

    try {
      if (selectedRole === 'client') {
        if (step === 'auth') {
          // Login de cliente
          if (!validateEmail(email)) {
            toastError('Por favor, informe um email válido');
            setIsLoading(false);
            return;
          }

          const { error } = await signIn(email, password);
          if (error) {
            if (error.message.includes('Invalid login credentials')) {
              toastError('Email ou senha incorretos');
            } else if (error.message.includes('Email not confirmed')) {
              toastError('Confirme seu email antes de fazer login. Verifique sua caixa de entrada.');
            } else {
              toastError(error.message);
            }
          } else {
            const check = await assertLoginMatchesRoleTab('client');
            if (!check.ok) {
              toastError(check.message);
              return;
            }
            if (establishmentLoading) {
              await new Promise((r) => setTimeout(r, 300));
            }
            const tenant = await assertCustomerSameEstablishment(establishmentId ?? null);
            if (!tenant.ok) {
              toastError(tenant.message);
              return;
            }
            const uid = (await supabase.auth.getUser()).data.user?.id;
            if (uid) await fetchProfile(uid);
            success('Login realizado com sucesso!');
            navigate('/');
          }
        } else if (step === 'signup') {
          // Cadastro de cliente
          if (!name.trim()) {
            toastError('Por favor, informe seu nome completo');
            setIsLoading(false);
            return;
          }

          if (!email.trim()) {
            toastError('Por favor, informe seu email');
            setIsLoading(false);
            return;
          }

          if (!validateEmail(email)) {
            toastError('Por favor, informe um email válido');
            setIsLoading(false);
            return;
          }

          if (email !== confirmEmail) {
            toastError('Os emails não coincidem');
            setIsLoading(false);
            return;
          }

          if (!password || password.length < 6) {
            toastError('A senha deve ter pelo menos 6 caracteres');
            setIsLoading(false);
            return;
          }

          if (password !== confirmPassword) {
            toastError('As senhas não coincidem');
            setIsLoading(false);
            return;
          }

          if (!phone.trim()) {
            toastError('Por favor, informe seu telefone');
            setIsLoading(false);
            return;
          }

          // Validar formato do telefone (apenas números e DDD)
          const phoneRegex = /^\d{10,11}$/;
          const cleanPhone = phone.replace(/\D/g, '');
          if (!phoneRegex.test(cleanPhone)) {
            toastError('Por favor, informe um telefone válido (10 ou 11 dígitos)');
            setIsLoading(false);
            return;
          }

          if (!establishmentId) {
            toastError('Cadastre-se pelo link ou site da sua loja para vincular sua conta.');
            setIsLoading(false);
            return;
          }

          // Criar conta de cliente com email e senha (metadata establishment_id → trigger)
          const { error } = await signUp(email, password, name, cleanPhone, establishmentId);
          if (error) {
            if (error.message.includes('User already registered')) {
              toastError('Este email já está cadastrado. Tente fazer login.');
            } else {
              toastError('Erro ao criar conta. Tente novamente.');
            }
          } else {
            success('Conta criada com sucesso! Redirecionando para verificação...');
            deferSkipResetForVerifyPhone = true;
            setTimeout(() => {
              navigate('/verify-phone');
              skipAutoRedirectRef.current = false;
            }, 2000);
          }
        }
      } else {
        // Login de profissional (somente quem foi cadastrado pelo dono)
        if (!validateEmail(email)) {
          toastError('Por favor, informe um email válido');
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toastError('Email ou senha incorretos');
          } else if (error.message.includes('Email not confirmed')) {
            toastError('Confirme seu email antes de fazer login. Verifique sua caixa de entrada.');
          } else {
            toastError(error.message);
          }
        } else {
          const check = await assertLoginMatchesRoleTab('barber');
          if (!check.ok) {
            toastError(check.message);
            return;
          }
          success('Login realizado com sucesso!');
          navigate('/barber');
        }
      }
    } catch (error) {
      toastError('Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(false);
      if (!deferSkipResetForVerifyPhone) {
        skipAutoRedirectRef.current = false;
      }
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
          <span className="text-xl font-semibold text-foreground">{establishmentDisplayName}</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md animate-fade-in">
          {step === 'select-role' ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Bem-vindo ao {establishmentDisplayName}
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
                  Sou profissional
                </Button>
              </div>
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Não tem conta?{' '}
                  <button
                    onClick={() => {
                      setSelectedRole('client');
                      setStep('signup');
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Criar uma
                  </button>
                </p>
              </div>
            </>
          ) : step === 'auth' && selectedRole === 'client' ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Login do Cliente
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
          ) : step === 'auth' && selectedRole === 'barber' ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Login do profissional
                </h1>
                <p className="text-muted-foreground">
                  Entre com seu email e senha
                </p>
                <p className="text-xs text-muted-foreground mt-3 text-center px-1">
                  Só é possível entrar com um email que o dono da loja cadastrou no painel.
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
          ) : step === 'signup' ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Criar Conta de Cliente
                </h1>
                <p className="text-muted-foreground">
                  Preencha todos os campos para criar sua conta
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm text-foreground">
                    Nome Completo
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="pl-10 h-12 bg-input border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                
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
                  <Label htmlFor="confirmEmail" className="text-sm text-foreground">
                    Confirmar Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmEmail"
                      type="email"
                      placeholder="seu@email.com"
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
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
                      placeholder="Mínimo 6 caracteres"
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
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm text-foreground">
                    Confirmar Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirme sua senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm text-foreground">
                    Telefone
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground flex items-center justify-center">
                      📱
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      maxLength={15}
                      className="pl-10 h-12 bg-input border-border text-foreground placeholder:text-muted-foreground"
                    />
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
                      Criar Conta
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
          ) : null}
        </div>
      </main>
    </div>
  );
}
