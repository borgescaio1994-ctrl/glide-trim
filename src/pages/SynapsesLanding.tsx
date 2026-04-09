/**
 * Landing do domínio principal synapses-ia.com.br.
 * Conteúdo estático em /synapse-landing/ (cópia de PROJETOS/landing-page - synapse.ia).
 * Para atualizar: volte a copiar index.html + assets para public/synapse-landing/ ou execute: npm run copy:synapse-landing
 */
export default function SynapsesLanding() {
  return (
    <iframe
      title="Synapses.ia"
      src={`${import.meta.env.BASE_URL}synapse-landing/index.html`}
      className="fixed inset-0 z-0 h-[100dvh] w-full border-0 bg-[#030304]"
      loading="eager"
    />
  );
}
