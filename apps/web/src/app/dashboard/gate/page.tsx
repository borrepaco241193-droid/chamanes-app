'use client'
import { useState } from 'react'
import { useAccessEvents } from '@/hooks/useStaff'
import { formatDateTime } from '@/lib/utils'
import { DoorOpen, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'

const METHOD_LABEL: Record<string, string> = {
  QR_CODE: 'QR', MANUAL_GUARD: 'Guardia', PLATE_RECOGNITION: 'Placa', APP: 'App',
}

const TYPE_COLOR: Record<string, string> = {
  ENTRY: 'text-green-600 bg-green-50',
  EXIT: 'text-red-500 bg-red-50',
}

export default function GatePage() {
  const [limit, setLimit] = useState(50)
  const { data, isLoading } = useAccessEvents(limit)
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  const events = Array.isArray(data) ? data : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control de Acceso</h1>
          <p className="text-gray-500 text-sm">Registro de entradas y salidas</p>
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['access-events', activeCommunityId] })}
          className="btn-secondary"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
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
                <th className="table-th">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={8} className="table-td text-center text-gray-400 py-8">Cargando...</td></tr>}
              {!isLoading && events.length === 0 && (
                <tr><td colSpan={8} className="table-td text-center py-12">
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
