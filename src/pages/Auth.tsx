import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Scissors, User, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, Phone } from 'lucide-react';

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
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (step === 'auth') {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message.includes('Invalid') ? 'Email ou senha incorretos' : error.message);
        } else {
          toast.success('Login realizado!');
          navigate('/');
        }
      } else if (step === 'signup') {
        if (!name.trim() || !phone.trim()) return toast.error('Preencha todos os campos');
        if (email !== confirmEmail) return toast.error('Os emails não coincidem');
        if (password !== confirmPassword) return toast.error('As senhas não coincidem');
        
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) return toast.error('Telefone inválido');

        const { error } = await signUp(email, password, name, cleanPhone);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Conta criada! Verifique seu WhatsApp.');
          setTimeout(() => navigate('/verify-phone'), 1500);
        }
      }
    } catch (err) {
      toast.error('Erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6 flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Scissors className="w-5 h-5 text-primary" />
        </div>
        <span className="text-xl font-semibold">BarberPro</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {step === 'select-role' ? (
            <div className="text-center space-y-6">
              <h1 className="text-3xl font-bold">Bem-vindo</h1>
              <div className="space-y-4">
                <Button onClick={() => { setSelectedRole('client'); setStep('auth'); }} className="w-full h-12 rounded-xl">Sou Cliente</Button>
                <Button onClick={() => { setSelectedRole('barber'); setStep('auth'); }} variant="outline" className="w-full h-12 rounded-xl">Sou Barbeiro</Button>
              </div>
              <p className="text-sm text-muted-foreground">Não tem conta? <button onClick={() => setStep('signup')} className="text-primary font-medium">Criar uma</button></p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold">{step === 'auth' ? 'Login' : 'Criar Conta'}</h1>
                <p className="text-muted-foreground">{selectedRole === 'barber' ? 'Acesso Profissional' : 'Acesso Cliente'}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {step === 'signup' && (
                  <>
                    <div className="space-y-2">
                      <Label>Nome Completo</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                        <Input className="pl-10" value={name} onChange={e => setName(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone (WhatsApp)</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                        <Input className="pl-10" placeholder="(11) 99999-9999" value={phone} onChange={e => setPhone(e.target.value)} required />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input className="pl-10" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>

                {step === 'signup' && (
                  <div className="space-y-2">
                    <Label>Confirmar Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                      <Input className="pl-10" type="email" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} required />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input className="pl-10 pr-10" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {step === 'signup' && (
                  <div className="space-y-2">
                    <Label>Confirmar Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                      <Input className="pl-10" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                    </div>
                  </div>
                )}

                <Button disabled={isLoading} className="w-full h-12 rounded-xl">
                  {isLoading ? <Loader2 className="animate-spin" /> : (step === 'auth' ? 'Entrar' : 'Cadastrar')}
                </Button>
              </form>
              <button onClick={() => setStep('select-role')} className="w-full text-sm text-muted-foreground">Voltar</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}