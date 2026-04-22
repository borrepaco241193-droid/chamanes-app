'use client'
import { useState } from 'react'
import { useAccessEvents } from '@/hooks/useStaff'
import { formatDateTime } from '@/lib/utils'
import { DoorOpen, ArrowUp, ArrowDown, RefreshCw, Download, LogIn, LogOut } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

const METHOD_LABEL: Record<string, string> = {
  QR_CODE: 'QR', MANUAL_GUARD: 'Guardia', PLATE_RECOGNITION: 'Placa', APP: 'App',
}

const TYPE_COLOR: Record<string, string> = {
  ENTRY: 'text-green-600 bg-green-50',
  EXIT: 'text-red-500 bg-red-50',
}

function downloadCSV(events: any[], communityMap: Record<string, string>) {
  const header = ['Tipo', 'Persona', 'Tipo persona', 'Método', 'Placa', 'Autorizado', 'Fecha y hora', 'Residencial', 'Notas']
  const rows = events.map((e) => [
    e.type === 'ENTRY' ? 'Entrada' : 'Salida',
    e.personName ?? '',
    e.personType ?? '',
    METHOD_LABEL[e.method] ?? e.method ?? '',
    e.plateNumber ?? '',
    e.isAllowed ? 'Sí' : 'No',
    formatDateTime(e.createdAt),
    communityMap[e._communityId] ?? '',
    e.notes ?? e.deniedReason ?? '',
  ])
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `accesos_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function GatePage() {
  const [limit, setLimit] = useState(50)
  const [gateMsg, setGateMsg] = useState('')
  const [gateLoading, setGateLoading] = useState<'entry' | 'exit' | null>(null)
  const { data, isLoading } = useAccessEvents(limit)
  const qc = useQueryClient()
  const { activeCommunityId, activeCommunityIds, user } = useAuthStore()
  const ids = activeCommunityIds.length > 0 ? activeCommunityIds : (activeCommunityId ? [activeCommunityId] : [])
  const communityMap = Object.fromEntries((user?.communities ?? []).map((c: any) => [c.id, c.name]))
  const hasMultiple = ids.length > 1
  const events = Array.isArray(data) ? data : []
  const communityId = activeCommunityId ?? activeCommunityIds[0]

  const sendGateCommand = async (type: 'entry' | 'exit') => {
    setGateLoading(type)
    setGateMsg('')
    try {
      const endpoint = type === 'entry' ? 'open' : 'exit'
      await api.post(`/communities/${communityId}/gate/${endpoint}`)
      setGateMsg(type === 'entry' ? '✅ Comando ENTRADA enviado — el Arduino debería activarse en 2 segundos' : '✅ Comando SALIDA enviado — el Arduino debería activarse en 2 segundos')
      setTimeout(() => qc.invalidateQueries({ queryKey: ['access-events', ids, limit] }), 3000)
    } catch (err: any) {
      setGateMsg('❌ Error: ' + (err?.response?.data?.message ?? err?.response?.data?.error ?? 'No se pudo enviar el comando'))
    } finally {
      setGateLoading(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control de Acceso</h1>
          <p className="text-gray-500 text-sm">Registro de entradas y salidas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCSV(events, communityMap)}
            disabled={events.length === 0}
            className="btn-secondary"
            title="Descargar CSV"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['access-events', ids, limit] })}
            className="btn-secondary"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>
      </div>

      {/* Gate control buttons */}
      <div className="card p-4 flex flex-col gap-3">
        <p className="text-sm font-medium text-gray-700">Control de puerta</p>
        <div className="flex gap-3">
          <button
            onClick={() => sendGateCommand('entry')}
            disabled={!!gateLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            <LogIn className="w-4 h-4" />
            {gateLoading === 'entry' ? 'Enviando...' : 'Abrir Entrada'}
          </button>
          <button
            onClick={() => sendGateCommand('exit')}
            disabled={!!gateLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {gateLoading === 'exit' ? 'Enviando...' : 'Abrir Salida'}
          </button>
        </div>
        {gateMsg && (
          <p className={`text-sm font-medium ${gateMsg.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>
            {gateMsg}
          </p>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Tipo</th>
                <th className="table-th">Persona</th>
                <th className="table-th">Tipo de persona</th>
                <th className="table-th">Método</th>
                <th className="table-th">Placa</th>
                <th className="table-th">Autorizado</th>
                <th className="table-th">Fecha y hora</th>
                {hasMultiple && <th className="table-th">Residencial</th>}
                <th className="table-th">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={hasMultiple ? 9 : 8} className="table-td text-center text-gray-400 py-8">Cargando...</td></tr>}
              {!isLoading && events.length === 0 && (
                <tr><td colSpan={hasMultiple ? 9 : 8} className="table-td text-center py-12">
                  <DoorOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400">Sin eventos de acceso</p>
                </td></tr>
              )}
              {events.map((e: any) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLOR[e.type]}`}>
                      {e.type === 'ENTRY' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                      {e.type === 'ENTRY' ? 'Entrada' : 'Salida'}
                    </span>
                  </td>
                  <td className="table-td font-medium">{e.personName}</td>
                  <td className="table-td capitalize text-gray-500">{e.personType}</td>
                  <td className="table-td text-gray-500">{METHOD_LABEL[e.method] ?? e.method}</td>
                  <td className="table-td text-gray-500">{e.plateNumber ?? '—'}</td>
                  <td className="table-td">
                    <span className={`badge ${e.isAllowed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {e.isAllowed ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="table-td text-gray-500">{formatDateTime(e.createdAt)}</td>
                  {hasMultiple && <td className="table-td text-gray-500">{communityMap[e._communityId] ?? '—'}</td>}
                  <td className="table-td text-gray-500">{e.notes ?? e.deniedReason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {events.length >= limit && (
          <div className="p-4 border-t border-gray-100 text-center">
            <button onClick={() => setLimit((l) => l + 50)} className="btn-secondary text-sm">
              Cargar más eventos
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
