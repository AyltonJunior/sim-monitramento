'use client'

import { StatusBadge } from '../components/ui/status-badge'
import { useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue, set, remove } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyAl5ZbgWviD4vf-3BjOZB9uQGhxPQT7Dy0",
  authDomain: "lav60-sim.firebaseapp.com",
  databaseURL: "https://lav60-sim-default-rtdb.firebaseio.com",
  projectId: "lav60-sim",
  storageBucket: "lav60-sim.firebasestorage.app",
  messagingSenderId: "76967549738",
  appId: "1:76967549738:web:005e2522cbd495a8491c53"
}

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

export default function Home() {
  const [stores, setStores] = useState<any[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedStore, setSelectedStore] = useState<any>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Função para verificar e atualizar status localmente
  const checkAndUpdateStatus = () => {
    const now = new Date()
    
    setStores(currentStores => 
      currentStores.map(store => {
        const lastUpdate = new Date(store.timestamp)
        const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60)
        
        if (diffMinutes > 1 && store.app_status !== 'down') {
          console.log(`🔴 Servidor ${store.store_id} está offline! Última atualização: ${lastUpdate.toLocaleString()}`)
          console.log(`⏱️ Tempo sem atualização: ${Math.floor(diffMinutes)} minutos`)
          
          // Tenta atualizar no Firebase, mas não espera pela resposta
          set(ref(database, `status/${store.id}`), {
            ...store,
            app_status: 'down'
          }).catch(() => {
            console.log('❌ Não foi possível atualizar o Firebase, mas o status foi alterado localmente')
          })
          
          // Retorna store com status atualizado localmente
          return {
            ...store,
            app_status: 'down'
          }
        }
        return store
      })
    )
  }

  useEffect(() => {
    // Verifica o status a cada 5 segundos
    const timer = setInterval(checkAndUpdateStatus, 5000)
    
    console.log('🔌 Conectando ao Firebase...')
    const storesRef = ref(database, 'status')
    
    const unsubscribe = onValue(storesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        console.log('📦 Dados recebidos do Firebase:', new Date().toLocaleString())
        const storesList = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value
        }))
        setStores(storesList)
      }
    })

    return () => {
      clearInterval(timer)
      unsubscribe()
    }
  }, [])

  // Função para excluir loja
  const handleDelete = async (storeId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Evita abrir o modal ao clicar no botão de excluir
    setShowDeleteConfirm(storeId)
  }

  // Função para confirmar exclusão
  const confirmDelete = async (storeId: string) => {
    try {
      await remove(ref(database, `status/${storeId}`))
      setShowDeleteConfirm(null)
      console.log(`Loja ${storeId} excluída com sucesso`)
    } catch (error) {
      console.error('Erro ao excluir loja:', error)
    }
  }

  // Filtragem das lojas
  const filteredStores = stores.filter(store => {
    const matchesStatus = selectedStatus === 'all' || store.app_status === selectedStatus
    const matchesSearch = store.store_id?.toString().toLowerCase().includes(searchTerm?.toLowerCase() || '') ||
                         store.machine_name?.toLowerCase().includes(searchTerm?.toLowerCase() || '')
    return matchesStatus && matchesSearch
  })

  // Calcula o resumo de status
  const statusSummary = stores.reduce((acc, store) => {
    acc[store.app_status] = (acc[store.app_status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Função para obter a mensagem de status detalhada
  const getDetailedStatus = (store: any) => {
    const lastUpdate = new Date(store.timestamp).getTime()
    const now = new Date().getTime()
    const fiveMinutes = 5 * 60 * 1000
    const isInactiveTooLong = (now - lastUpdate) > fiveMinutes

    // Se estiver inativo por muito tempo
    if (isInactiveTooLong) {
      const minutesInactive = Math.floor((now - lastUpdate) / (60 * 1000))
      return {
        steps: [
          { label: `Última atualização: ${minutesInactive} minutos atrás`, error: true },
          { label: 'Sistema possivelmente desligado', error: true },
          { label: 'Verificar conexão com a loja', error: true }
        ],
        message: 'Sistema Desligado'
      }
    }

    // Se não estiver rodando, mostra os passos de reinicialização
    if (store.app_status !== 'running' || store.restart_status === 'accepted') {
      return {
        steps: [
          { label: '1. Parando aplicação atual', done: true },
          { label: '2. Verificando processos', done: true },
          { label: '3. Instalando dependências', status: 'current' },
          { label: '4. Executando build', pending: true },
          { label: '5. Iniciando aplicação', pending: true }
        ],
        message: 'Reiniciando aplicação...'
      }
    }
    
    return null
  }

  const getStatusDisplay = (store: any) => {
    // Verifica se está inativo por mais de 5 minutos
    const lastUpdate = new Date(store.timestamp).getTime()
    const now = new Date().getTime()
    const fiveMinutes = 5 * 60 * 1000 // 5 minutos em milissegundos
    const isInactiveTooLong = (now - lastUpdate) > fiveMinutes

    // Se estiver inativo por muito tempo, mostra como desligado
    if (isInactiveTooLong) {
      return {
        text: 'Desligado',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800'
      }
    }

    // Se estiver rodando normalmente
    if (store.app_status === 'running' && store.restart_status !== 'accepted') {
      return {
        text: 'Rodando',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800'
      }
    }

    // Para qualquer outro estado (reiniciando, erro, build, etc)
    return {
      text: 'Reiniciando',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800'
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      {/* Modal de Detalhes */}
      {selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Detalhes da Loja {selectedStore.store_id}
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowDeleteConfirm(selectedStore.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Excluir loja"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setSelectedStore(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Status do Sistema */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Status do Sistema</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <span className="text-gray-500">Status da Aplicação:</span>
                    {(() => {
                      const status = getStatusDisplay(selectedStore)
                      return (
                        <span className={`ml-2 font-medium ${status.textColor}`}>
                          {status.text}
                        </span>
                      )
                    })()}
                  </div>
                  <div>
                    <span className="text-gray-500">Porta 3000:</span>
                    <span className={`ml-2 font-medium ${selectedStore.port_3000 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedStore.port_3000 ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">CPU:</span>
                    <span className={`ml-2 font-medium ${
                      selectedStore.cpu_usage > 90 ? 'text-red-600' :
                      selectedStore.cpu_usage > 70 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {selectedStore.cpu_usage}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Memória RAM:</span>
                    <span className={`ml-2 font-medium ${
                      selectedStore.memory_usage > 90 ? 'text-red-600' :
                      selectedStore.memory_usage > 70 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {selectedStore.memory_usage}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">HD:</span>
                    <span className={`ml-2 font-medium ${
                      selectedStore.disk_usage > 90 ? 'text-red-600' :
                      selectedStore.disk_usage > 70 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {selectedStore.disk_usage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Status dos Dispositivos */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Status dos Dispositivos</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  {/* Dosadoras */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Dosadoras</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedStore.devices?.dosadoras?.map((device: any) => (
                        <div key={device.name} className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${device.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-sm text-gray-600">{device.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Lavadoras */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Lavadoras</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedStore.devices?.lavadoras?.map((device: any) => (
                        <div key={device.name} className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${device.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-sm text-gray-600">{device.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Secadoras */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Secadoras</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedStore.devices?.secadoras?.map((device: any) => (
                        <div key={device.name} className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${device.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-sm text-gray-600">{device.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Outros */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Outros</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedStore.devices?.outros?.map((device: any) => (
                        <div key={device.name} className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${device.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-sm text-gray-600">{device.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status dos Processos</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <span className="text-gray-500">Bloco de Notas:</span>
                  <span className={`ml-2 ${selectedStore.processes?.notepad ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedStore.processes?.notepad ? 'Rodando' : 'Parado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Status de Inicialização */}
            {getDetailedStatus(selectedStore) && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getDetailedStatus(selectedStore)?.message}
                  </h3>
                  <div className="space-y-3">
                    {getDetailedStatus(selectedStore)?.steps.map((step, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          step.done ? 'bg-green-100 text-green-600' :
                          step.error ? 'bg-red-100 text-red-600' :
                          step.status === 'current' ? 'bg-blue-100 text-blue-600' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          {step.done && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {step.error && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          {step.status === 'current' && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                          )}
                          {step.pending && (
                            <div className="w-2 h-2 bg-gray-400 rounded-full" />
                          )}
                        </div>
                        <span className={`text-sm ${
                          step.done ? 'text-gray-900' :
                          step.error ? 'text-red-600' :
                          step.status === 'current' ? 'text-blue-600 font-medium' :
                          'text-gray-500'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div>Última atualização: {new Date(selectedStore.timestamp).toLocaleString()}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    set(ref(database, `status/${selectedStore.id}/restart`), true)
                      .then(() => console.log(`Solicitação de restart enviada para loja ${selectedStore.store_id}`))
                      .catch(err => console.error('Erro ao solicitar restart:', err));
                  }}
                  disabled={selectedStore.restart_status === 'accepted'}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedStore.restart_status === 'accepted'
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {selectedStore.restart_status === 'accepted' ? '⏳ Reiniciando...' : '🔄 Reiniciar Aplicação'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir esta loja? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  confirmDelete(showDeleteConfirm)
                  setSelectedStore(null) // Fecha o modal de detalhes após excluir
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Monitor SIM</h1>
          <p className="mt-1 text-sm text-gray-500">Sistema Integrado de Monitoramento</p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {['running', 'down', 'error', 'restarting'].map((status) => (
            <div key={status} className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">
                {status === 'running' ? 'Rodando' :
                 status === 'down' ? 'Desligado' :
                 status === 'error' ? 'Com Erro' : 'Reiniciando'}
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {statusSummary[status] || 0}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="text"
            placeholder="Buscar por ID da loja..."
            className="flex-1 p-2 rounded-lg border border-gray-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="w-full sm:w-48 p-2 rounded-lg border border-gray-300"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="running">Rodando</option>
            <option value="down">Desligado</option>
            <option value="error">Erro</option>
            <option value="restarting">Reiniciando</option>
          </select>
        </div>

        {/* Server Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStores.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              Nenhum servidor encontrado
            </div>
          ) : (
            filteredStores.map((store) => (
              <div 
                key={store.id} 
                className="bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedStore(store)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Loja {store.store_id}</h3>
                    <p className="text-sm text-gray-500">{store.machine_name}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {/* Status do Sistema */}
                    {(() => {
                      const status = getStatusDisplay(store)
                      return (
                        <span className={`px-2 py-1 text-xs rounded-full ${status.bgColor} ${status.textColor}`}>
                          {status.text}
                        </span>
                      )
                    })()}
                    {/* Status do Bloco de Notas */}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      store.processes?.notepad 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      Bloco de Notas {store.processes?.notepad ? 'Rodando' : 'Parado'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="text-gray-500">
                    Última atualização: {new Date(store.timestamp).toLocaleString()}
                  </div>
                  <div className="text-gray-500">
                    Porta 3000: {' '}
                    <span className={
                      store.app_status === 'down' 
                        ? 'text-gray-400'
                        : store.app_status === 'error'
                          ? 'text-yellow-600'
                          : store.port_3000 
                          ? 'text-green-600' 
                          : 'text-red-600'
                    }>
                      {store.app_status === 'down' ? 'Inativa' : (store.port_3000 ? 'Ativa' : 'Inativa')}
                    </span>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div className="text-gray-500">
                    CPU: {' '}
                    <span className={
                      store.cpu_usage > 90 ? 'text-red-600' :
                      store.cpu_usage > 70 ? 'text-yellow-600' :
                      'text-green-600'
                    }>
                      {store.cpu_usage || 0}%
                    </span>
                  </div>
                  <div className="text-gray-500">
                    RAM: {' '}
                    <span className={
                      store.memory_usage > 90 ? 'text-red-600' :
                      store.memory_usage > 70 ? 'text-yellow-600' :
                      'text-green-600'
                    }>
                      {store.memory_usage || 0}%
                    </span>
                  </div>
                  <div className="text-gray-500">
                    HD: {' '}
                    <span className={
                      store.disk_usage > 90 ? 'text-red-600' :
                      store.disk_usage > 70 ? 'text-yellow-600' :
                      'text-green-600'
                    }>
                      {store.disk_usage || 0}%
                    </span>
                  </div>
                </div>

                {/* Status dos Dispositivos */}
                <div className="mt-3 text-sm">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div className="text-gray-500">
                      <span className="font-medium">Dosadoras: </span>
                      {store.devices?.dosadoras?.map((device: any, i: number) => (
                        <span key={device.name} className={`relative inline-block ${i > 0 ? 'ml-1' : ''} group`}>
                          <span className={`${device.online ? 'text-green-600' : 'text-red-600'} cursor-pointer`}>●</span>
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {device.name}
                          </span>
                        </span>
                      ))}
                    </div>
                    <div className="text-gray-500">
                      <span className="font-medium">Lavadoras: </span>
                      {store.devices?.lavadoras?.map((device: any, i: number) => (
                        <span key={device.name} className={`relative inline-block ${i > 0 ? 'ml-1' : ''} group`}>
                          <span className={`${device.online ? 'text-green-600' : 'text-red-600'} cursor-pointer`}>●</span>
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {device.name}
                          </span>
                        </span>
                      ))}
                    </div>
                    <div className="text-gray-500">
                      <span className="font-medium">Secadoras: </span>
                      {store.devices?.secadoras?.map((device: any, i: number) => (
                        <span key={device.name} className={`relative inline-block ${i > 0 ? 'ml-1' : ''} group`}>
                          <span className={`${device.online ? 'text-green-600' : 'text-red-600'} cursor-pointer`}>●</span>
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {device.name}
                          </span>
                        </span>
                      ))}
                    </div>
                    <div className="text-gray-500">
                      <span className="font-medium">Outros: </span>
                      {store.devices?.outros?.map((device: any, i: number) => (
                        <span key={device.name} className={`relative inline-block ${i > 0 ? 'ml-1' : ''} group`}>
                          <span className={`${device.online ? 'text-green-600' : 'text-red-600'} cursor-pointer`}>●</span>
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {device.name}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}