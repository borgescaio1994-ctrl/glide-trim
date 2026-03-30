import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../../integrations/supabase/client'
import type { Establishment } from '../../../types/establishment'
import { Loader2, MapPin, Phone, Clock, Calendar, Scissors } from 'lucide-react'

export default function AgendarSlugPage() {
  const { slug } = useParams<{ slug: string }>()
  const [establishment, setEstablishment] = useState<Establishment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setError('Slug não encontrado')
      setLoading(false)
      return
    }

    fetchEstablishment()
  }, [slug])

  const fetchEstablishment = async () => {
    try {
      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('slug', slug)
        .eq('status', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Estabelecimento não encontrado')
        } else {
          setError('Erro ao carregar estabelecimento')
          console.error('Error fetching establishment:', error)
        }
        setLoading(false)
        return
      }

      if (!data) {
        setError('Estabelecimento não encontrado')
        setLoading(false)
        return
      }

      setEstablishment(data)
      setLoading(false)
    } catch (err) {
      setError('Erro ao carregar estabelecimento')
      console.error('Unexpected error:', err)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Carregando informações da barbearia...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-800 mb-4">
              Estabelecimento não encontrado
            </h1>
            <p className="text-red-600 mb-6">
              {error}
            </p>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Possíveis motivos:
              </p>
              <ul className="text-sm text-gray-600 text-left space-y-1">
                <li>• O subdomínio foi digitado incorretamente</li>
                <li>• A barbearia não está mais ativa</li>
                <li>• O link expirou ou foi desativado</li>
              </ul>
            </div>
            <button
              onClick={() => window.location.href = 'https://synapses-ia.com.br'}
              className="mt-6 w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ir para página principal
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!establishment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Estabelecimento não encontrado
          </h1>
          <button
            onClick={() => window.location.href = 'https://synapses-ia.com.br'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir para página principal
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scissors className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{establishment.name}</h1>
                <p className="text-sm text-gray-600">Barbearia</p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = 'https://synapses-ia.com.br'}
              className="text-gray-600 hover:text-gray-900"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Info Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Informações</h2>
              
              <div className="space-y-4">
                {establishment.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Endereço</p>
                      <p className="text-sm text-gray-600">{establishment.address}</p>
                    </div>
                  </div>
                )}

                {establishment.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Telefone</p>
                      <p className="text-sm text-gray-600">{establishment.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Funcionamento</p>
                    <p className="text-sm text-gray-600">
                      {establishment.opening_hours || 'Horário a definir'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <button
                onClick={() => {
                  // Redirecionar para página de agendamento
                  window.location.href = `/agendar/${slug}/booking`
                }}
                className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
              >
                Agendar Horário
              </button>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Agende seu horário de forma rápida e fácil
              </p>
            </div>
          </div>

          {/* Right Column - Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Welcome Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Bem-vindo à {establishment.name}
              </h2>
              <p className="text-gray-600 mb-6">
                {establishment.description || 
                 'Profissionais qualificados e prontos para deixar seu visual em dia. ' +
                 'Agende seu horário e desfrute de um atendimento de qualidade.'
                }
              </p>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Agendamento Online</p>
                    <p className="text-sm text-gray-600">Escolha seu horário preferido</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Scissors className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Serviços Profissionais</p>
                    <p className="text-sm text-gray-600">Cortes, barbas e tratamentos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            {establishment.custom_domain && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-3">Domínio Personalizado</h3>
                <p className="text-sm text-gray-600">
                  Esta barbearia também pode ser acessada através do domínio personalizado:
                </p>
                <div className="mt-2 p-3 bg-gray-50 rounded border">
                  <code className="text-sm text-blue-600">
                    https://{establishment.custom_domain}
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
