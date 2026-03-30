import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, Home, ArrowLeft } from 'lucide-react'

export default function NotFound404() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Scissors className="w-10 h-10 text-gray-400" />
            </div>
            <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Barbearia Não Encontrada
            </h2>
          </div>

          {/* Message */}
          <div className="space-y-4 mb-8">
            <p className="text-gray-600">
              A barbearia que você está procurando não existe ou não está mais ativa.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Possíveis motivos:
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• O subdomínio foi digitado incorretamente</li>
                <li>• A barbearia ainda não foi configurada</li>
                <li>• A barbearia foi desativada ou removida</li>
                <li>• O link expirou ou foi alterado</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Ir para página inicial
            </button>
            
            <button
              onClick={() => window.location.href = 'https://synapses-ia.com.br'}
              className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Visitar Glide Trim
            </button>
            
            <button
              onClick={() => navigate(-1)}
              className="w-full text-blue-600 hover:text-blue-700 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para página anterior
            </button>
          </div>

          {/* Help */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-gray-500">
              Se você acredita que isso é um erro, entre em contato com o suporte.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
