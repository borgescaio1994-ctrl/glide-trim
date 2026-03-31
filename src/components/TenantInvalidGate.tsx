import { Scissors } from 'lucide-react';

/**
 * Subdomínio/domínio sem estabelecimento ativo no Supabase (porteiro).
 */
export default function TenantInvalidGate() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background px-6">
      <div className="rounded-full bg-muted p-5">
        <Scissors className="h-12 w-12 text-muted-foreground" aria-hidden />
      </div>
      <p className="text-center text-lg font-medium text-foreground max-w-md">
        Esta barbearia ainda não foi configurada ou o domínio é inválido.
      </p>
      <p className="text-center text-sm text-muted-foreground max-w-md">
        Verifique o endereço ou entre em contacto com a Synapses IA.
      </p>
      <a
        href="https://synapses-ia.com.br"
        className="text-primary font-medium underline underline-offset-4 hover:no-underline"
      >
        Ir para o site da agência
      </a>
    </div>
  );
}
