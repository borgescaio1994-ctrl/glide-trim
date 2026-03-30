import React, { useEffect } from 'react'

/**
 * Landing page da Synapse.ia convertida para React
 * Baseada no arquivo index.html original
 */
export default function SynapseLandingPage() {
  useEffect(() => {
    // Injeta os estilos da landing page original
    const styles = `
      :root {
        --black: #030304;
        --leather: #060608;
        --chrome-light: #f0f4f8;
        --chrome-mid: #8b9cb3;
        --chrome-dark: #3d4856;
        --cyan: #00e5ff;
        --cyan-soft: rgba(0, 229, 255, 0.45);
        --cyan-dim: rgba(0, 229, 255, 0.12);
        --text: #f1f5f9;
        --text-muted: #94a3b8;
        --border-chrome: linear-gradient(145deg, rgba(255, 255, 255, 0.35), rgba(100, 116, 139, 0.25));
        --ease: cubic-bezier(0.22, 1, 0.36, 1);
        --radius: 18px;
        --radius-lg: 26px;
      }

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      html {
        scroll-behavior: smooth;
        scroll-padding-top: 5.5rem;
      }

      body {
        font-family: "Inter", system-ui, sans-serif;
        background-color: var(--black);
        color: var(--text);
        line-height: 1.65;
        overflow-x: hidden;
        -webkit-font-smoothing: antialiased;
        padding-bottom: max(5rem, env(safe-area-inset-bottom, 0px));
      }

      /* Leather + spotlight base */
      .page-bg {
        position: fixed;
        inset: 0;
        z-index: -1;
        background: radial-gradient(ellipse 80% 40% at 50% 20%, rgba(0, 229, 255, 0.08) 0%, transparent 50%),
                    radial-gradient(ellipse 60% 30% at 80% 60%, rgba(0, 229, 255, 0.05) 0%, transparent 50%),
                    linear-gradient(180deg, var(--black) 0%, var(--leather) 100%);
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1rem;
      }

      /* Header */
      header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 100;
        background: rgba(3, 3, 4, 0.8);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 0;
      }

      .logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text);
        text-decoration: none;
      }

      .logo img {
        width: 40px;
        height: 40px;
      }

      .nav-links {
        display: flex;
        gap: 2rem;
        align-items: center;
      }

      .nav-links a {
        color: var(--text-muted);
        text-decoration: none;
        font-weight: 500;
        transition: color 0.2s;
      }

      .nav-links a:hover {
        color: var(--text);
      }

      .cta-button {
        background: var(--cyan);
        color: var(--black);
        padding: 0.75rem 1.5rem;
        border-radius: var(--radius);
        text-decoration: none;
        font-weight: 600;
        transition: all 0.2s;
      }

      .cta-button:hover {
        background: var(--cyan-soft);
      }

      /* Hero Section */
      .hero {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6rem 0 4rem;
        text-align: center;
      }

      .hero-content {
        max-width: 800px;
      }

      .hero h1 {
        font-size: clamp(2.5rem, 8vw, 5rem);
        font-weight: 800;
        line-height: 1.1;
        margin-bottom: 2rem;
        background: linear-gradient(135deg, var(--text) 0%, var(--cyan) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .hero p {
        font-size: 1.25rem;
        color: var(--text-muted);
        margin-bottom: 3rem;
        line-height: 1.6;
      }

      .hero-cta {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }

      .primary-button {
        background: var(--cyan);
        color: var(--black);
        padding: 1rem 2rem;
        border-radius: var(--radius);
        text-decoration: none;
        font-weight: 600;
        font-size: 1.1rem;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }

      .primary-button:hover {
        background: var(--cyan-soft);
        transform: translateY(-2px);
      }

      .secondary-button {
        background: transparent;
        color: var(--text);
        padding: 1rem 2rem;
        border: 1px solid var(--border-chrome);
        border-radius: var(--radius);
        text-decoration: none;
        font-weight: 600;
        font-size: 1.1rem;
        transition: all 0.2s;
      }

      .secondary-button:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: var(--text);
      }

      /* Projects Section */
      .projects {
        padding: 6rem 0;
      }

      .section-header {
        text-align: center;
        margin-bottom: 4rem;
      }

      .section-header h2 {
        font-size: clamp(2rem, 5vw, 3.5rem);
        font-weight: 800;
        margin-bottom: 1rem;
        color: var(--text);
      }

      .section-header p {
        font-size: 1.25rem;
        color: var(--text-muted);
        max-width: 600px;
        margin: 0 auto;
      }

      .projects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 2rem;
        margin-bottom: 4rem;
      }

      .project-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--border-chrome);
        border-radius: var(--radius-lg);
        padding: 2rem;
        transition: all 0.3s;
      }

      .project-card:hover {
        transform: translateY(-4px);
        background: rgba(255, 255, 255, 0.04);
        border-color: var(--cyan-soft);
      }

      .project-icon {
        width: 60px;
        height: 60px;
        background: var(--cyan-dim);
        border-radius: var(--radius);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1.5rem;
        font-size: 1.5rem;
      }

      .project-card h3 {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 1rem;
        color: var(--text);
      }

      .project-card p {
        color: var(--text-muted);
        margin-bottom: 1.5rem;
        line-height: 1.6;
      }

      .project-link {
        color: var(--cyan);
        text-decoration: none;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        transition: gap 0.2s;
      }

      .project-link:hover {
        gap: 0.75rem;
      }

      .project-screenshot {
        width: 100%;
        height: 200px;
        object-fit: cover;
        border-radius: var(--radius);
        margin-bottom: 1.5rem;
      }

      /* Footer */
      footer {
        padding: 4rem 0 2rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
      }

      .footer-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rem;
      }

      .footer-logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text);
      }

      .footer-logo img {
        width: 32px;
        height: 32px;
      }

      .footer-links {
        display: flex;
        gap: 2rem;
        flex-wrap: wrap;
      }

      .footer-links a {
        color: var(--text-muted);
        text-decoration: none;
        transition: color 0.2s;
      }

      .footer-links a:hover {
        color: var(--text);
      }

      .copyright {
        color: var(--text-muted);
        font-size: 0.9rem;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .nav-links {
          display: none;
        }

        .hero h1 {
          font-size: clamp(2rem, 10vw, 3rem);
        }

        .hero p {
          font-size: 1.1rem;
        }

        .hero-cta {
          flex-direction: column;
          align-items: center;
        }

        .projects-grid {
          grid-template-columns: 1fr;
        }
      }
    `

    const styleElement = document.createElement('style')
    styleElement.textContent = styles
    document.head.appendChild(styleElement)

    return () => {
      if (styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement)
      }
    }
  }, [])

  return (
    <div className="page-bg">
      {/* Header */}
      <header>
        <nav className="container">
          <a href="#" className="logo">
            <img src="/assets/synapse-chip.svg" alt="Synapse.ia" />
            Synapse.ia
          </a>
          <div className="nav-links">
            <a href="#projects">Projetos</a>
            <a href="#about">Sobre</a>
            <a href="#contact">Contato</a>
            <a href="#" className="cta-button">Fale Conosco</a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>
              Soluções tecnológicas
              <br />
              <span style={{ color: 'var(--cyan)' }}>ultra premium</span>
            </h1>
            <p>
              PWAs de alta performance, automações inteligentes com n8n e Evolution API. 
              BookNow e Pediu Chegou: sistemas que revolucionam negócios.
            </p>
            <div className="hero-cta">
              <a href="#projects" className="primary-button">
                Conhecer Projetos
                <span>→</span>
              </a>
              <a href="#contact" className="secondary-button">
                Entrar em Contato
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="projects">
        <div className="container">
          <div className="section-header">
            <h2>Nossos Projetos</h2>
            <p>
              Soluções completas desenvolvidas com tecnologia de ponta 
              para transformar seu negócio
            </p>
          </div>

          <div className="projects-grid">
            {/* BookNow */}
            <div className="project-card">
              <img 
                src="/assets/screenshot-booknow.png" 
                alt="BookNow App" 
                className="project-screenshot"
              />
              <div className="project-icon">💇</div>
              <h3>BookNow</h3>
              <p>
                Sistema completo para barbearias com agendamento online, 
                gestão de clientes e controle financeiro. Multi-tenancy 
                com domínios personalizados.
              </p>
              <a 
                href="https://barbearia-stoffels.synapses-ia.com.br" 
                className="project-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Acessar Projeto
                <span>→</span>
              </a>
            </div>

            {/* Pediu Chegou */}
            <div className="project-card">
              <img 
                src="/assets/screenshot-pediu-chegou.png" 
                alt="Pediu Chegou App" 
                className="project-screenshot"
              />
              <div className="project-icon">🚴</div>
              <h3>Pediu Chegou</h3>
              <p>
                Plataforma de delivery completa com gestão de pedidos, 
                rastreamento em tempo real, integração com pagamento 
                e analytics inteligente.
              </p>
              <a 
                href="https://pediu-chegou.synapses-ia.com.br" 
                className="project-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Acessar Projeto
                <span>→</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <img src="/assets/synapse-chip.svg" alt="Synapse.ia" />
              Synapse.ia
            </div>
            <div className="footer-links">
              <a href="#projects">Projetos</a>
              <a href="#about">Sobre</a>
              <a href="#contact">Contato</a>
              <a href="#">GitHub</a>
            </div>
            <div className="copyright">
              © 2024 Synapse.ia. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
