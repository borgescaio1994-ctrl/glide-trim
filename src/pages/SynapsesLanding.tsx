import React from 'react'
import { ArrowRight, Code, Smartphone, Users, BarChart3, Package, Globe, CheckCircle, Star } from 'lucide-react'

export default function SynapsesLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="relative overflow-hidden">
        <nav className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Code className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">Synapses IA</span>
            </div>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Entre em Contato
            </button>
          </div>
        </nav>
        
        {/* Hero Section */}
        <div className="container mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Soluções Inteligentes para
            <span className="text-blue-400"> Seu Negócio</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Transformamos ideias em realidade digital com aplicações multi-tenancy, 
            CRM inteligente e sistemas de delivery que impulsionam seu crescimento.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg flex items-center justify-center gap-2">
              Começar Agora
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="bg-white/10 text-white px-8 py-4 rounded-lg hover:bg-white/20 transition-colors font-medium text-lg border border-white/20">
              Ver Demonstração
            </button>
          </div>
        </div>
        
        {/* Background Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>
      </header>

      {/* Apps Section */}
      <section className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Nossas Plataformas
            </h2>
            <p className="text-xl text-gray-300">
              Soluções completas para diferentes segmentos do seu negócio
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Barbearia App */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Glide Trim</h3>
              <p className="text-gray-300 mb-4">
                Sistema completo para barbearias com agendamento online, 
                gestão de clientes e controle financeiro.
              </p>
              <a 
                href="https://barbearia-stoffels.synapses-ia.com.br"
                className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                Acessar Plataforma
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* CRM */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">CRM Pro</h3>
              <p className="text-gray-300 mb-4">
                Gestão de relacionamento com clientes, 
                automação de vendas e analytics inteligentes.
              </p>
              <button className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">
                Em Breve
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Delivery */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Delivery Hub</h3>
              <p className="text-gray-300 mb-4">
                Plataforma completa para delivery com 
                gestão de pedidos, rotas e integrações.
              </p>
              <button className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">
                Em Breve
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">
                Tecnologia de Ponta para
                <span className="text-blue-400"> Seu Sucesso</span>
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-400 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Multi-Tenancy</h3>
                    <p className="text-gray-300">
                      Cada cliente com sua instância personalizada e segura
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-400 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Inteligência Artificial</h3>
                    <p className="text-gray-300">
                      Automação e insights baseados em IA para decisões melhores
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-400 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Integração Total</h3>
                    <p className="text-gray-300">
                      Conectamos todas as ferramentas em um ecossistema unificado
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">99.9%</div>
                  <div className="text-gray-300">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">24/7</div>
                  <div className="text-gray-300">Suporte</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">100+</div>
                  <div className="text-gray-300">Clientes</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">5★</div>
                  <div className="text-gray-300">Avaliação</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Pronto para Transformar Seu Negócio?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de empresas que já estão crescendo 
            com nossas soluções inteligentes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors font-medium text-lg">
              Fale Conosco
            </button>
            <button className="bg-white/20 text-white px-8 py-4 rounded-lg hover:bg-white/30 transition-colors font-medium text-lg border border-white/30">
              Ver Planos
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-black/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Code className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Synapses IA</span>
            </div>
            <div className="text-gray-400 text-center">
              © 2024 Synapses IA. Todos os direitos reservados.
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                LinkedIn
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                GitHub
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Email
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
