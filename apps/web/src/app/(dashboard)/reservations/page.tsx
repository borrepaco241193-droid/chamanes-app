'use client'
import { useState } from 'react'
import { useReservations, useUpdateReservation } from '@/hooks/useReservations'
import { formatDate, RESERVATION_STATUS_COLOR, RESERVATION_STATUS_LABEL, fullName } from '@/lib/utils'
import { Calendar, CheckCircle, XCircle, X } from 'lucide-react'

const TABS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const

export default function ReservationsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL')
  const { data, isLoading } = useReservations(tab)
  const update = useUpdateReservation()
  const reservations = Array.isArray(data) ? data : []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reservaciones</h1>
        <p className="text-gray-500 text-sm">Gestión de áreas comunes</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'ALL' ? 'Todas' : RESERVATION_STATUS_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Residente</th>
                <th className="table-th">Área</th>
                <th className="table-th">Fecha inicio</th>
                <th className="table-th">Fecha fin</th>
                <th className="table-th">Asistentes</th>
                <th className="table-th">Estado</th>
                <th className="table-th">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={7} className="table-td text-center text-gray-400 py-8">Cargando...</td></tr>}
              {!isLoading && reservations.length === 0 && (
                <tr><td colSpan={7} className="table-td text-center py-12">
                  <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400">No hay reservaciones</p>
                </td></tr>
              )}
              {reservations.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td font-medium">{fullName(r.user)}</td>
                  <td className="table-td">{r.commonArea?.name}</td>
                  <td className="table-td">{formatDate(r.startTime, 'dd/MM HH:mm')}</td>
                  <td className="table-td">{formatDate(r.endTime, 'dd/MM HH:mm')}</td>
                  <td className="table-td text-center">{r.attendees}</td>
                  <td className="table-td">
                    <span className={`badge ${RESERVATION_STATUS_COLOR[r.status]}`}>
                      {RESERVATION_STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="table-td">
                    {r.status === 'PENDING' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => update.mutate({ reservationId: r.id, status: 'CONFIRMED' })}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Aprobar"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => update.mutate({ reservationId: r.id, status: 'CANCELLED' })}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Rechazar"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {r.status === 'CONFIRMED' && (
                      <button
                        onClick={() => update.mutate({ reservationId: r.id, status: 'CANCELLED' })}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
