'use client'
import { useState, useMemo } from 'react'
import {
  useReservations, useUpdateReservation, useApproveReservation, useCreateReservation, useAreas,
} from '@/hooks/useReservations'
import { formatDate, RESERVATION_STATUS_COLOR, RESERVATION_STATUS_LABEL, fullName } from '@/lib/utils'
import {
  Calendar, CheckCircle, XCircle, X, List, ChevronLeft, ChevronRight, Plus,
} from 'lucide-react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay,
  addMonths, subMonths, getDay,
} from 'date-fns'
import { es } from 'date-fns/locale'

const TABS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const

const STATUS_DOT: Record<string, string> = {
  PENDING:   'bg-yellow-400',
  CONFIRMED: 'bg-green-500',
  CANCELLED: 'bg-red-400',
  COMPLETED: 'bg-blue-400',
  NO_SHOW:   'bg-gray-400',
}

// ── Approve Modal ────────────────────────────────────────────

function ApproveModal({ reservation, onClose, approve }: { reservation: any; onClose: () => void; approve: any }) {
  const [extraCharge, setExtraCharge] = useState('')
  const [chargeNote, setChargeNote] = useState('')

  const handleApprove = async () => {
    await approve.mutateAsync({
      reservationId: reservation.id,
      approve: true,
      extraCharge: extraCharge ? parseFloat(extraCharge) : undefined,
      chargeNote: chargeNote || undefined,
    })
    onClose()
  }
  const handleReject = async () => {
    await approve.mutateAsync({ reservationId: reservation.id, approve: false })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Revisar reservación</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
            <p><span className="text-gray-500">Residente:</span> <span className="font-medium">{fullName(reservation.user)}</span></p>
            <p><span className="text-gray-500">Área:</span> <span className="font-medium">{reservation.commonArea?.name}</span></p>
            <p><span className="text-gray-500">Fecha:</span> <span className="font-medium">{formatDate(reservation.startTime, 'dd/MM/yyyy HH:mm')} – {formatDate(reservation.endTime, 'HH:mm')}</span></p>
            <p><span className="text-gray-500">Asistentes:</span> <span className="font-medium">{reservation.attendees}</span></p>
            {reservation.feeAmount > 0 && <p><span className="text-gray-500">Tarifa base:</span> <span className="font-medium">${Number(reservation.feeAmount).toFixed(2)}</span></p>}
          </div>
          <div>
            <label className="label">Cargo adicional opcional (MXN)</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={extraCharge} onChange={(e) => setExtraCharge(e.target.value)} />
          </div>
          {extraCharge && parseFloat(extraCharge) > 0 && (
            <div>
              <label className="label">Nota del cargo</label>
              <input className="input" placeholder="Limpieza, depósito..." value={chargeNote} onChange={(e) => setChargeNote(e.target.value)} />
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={handleReject} disabled={approve.isPending} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
              <XCircle className="w-4 h-4" /> Rechazar
            </button>
            <button onClick={handleApprove} disabled={approve.isPending} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors">
              <CheckCircle className="w-4 h-4" /> {approve.isPending ? 'Guardando...' : 'Aprobar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Create Reservation Modal ─────────────────────────────────

function CreateReservationModal({ defaultDate, areas, onClose, create }: {
  defaultDate: Date | null; areas: any[]; onClose: () => void; create: any
}) {
  const dateStr = defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  const [form, setForm] = useState({
    commonAreaId: areas[0]?.id ?? '',
    startDate: dateStr,
    startTime: '10:00',
    endTime: '12:00',
    attendees: '1',
    notes: '',
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await create.mutateAsync({
        commonAreaId: form.commonAreaId,
        startTime: new Date(`${form.startDate}T${form.startTime}:00`).toISOString(),
        endTime: new Date(`${form.startDate}T${form.endTime}:00`).toISOString(),
        attendees: parseInt(form.attendees),
        notes: form.notes || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al crear la reservación')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Nueva reservación</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Área común</label>
            <select className="input" value={form.commonAreaId} onChange={(e) => setForm({ ...form, commonAreaId: e.target.value })} required>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Fecha</label>
            <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Hora inicio</label><input className="input" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required /></div>
            <div><label className="label">Hora fin</label><input className="input" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required /></div>
          </div>
          <div>
            <label className="label">Número de asistentes</label>
            <input className="input" type="number" min="1" value={form.attendees} onChange={(e) => setForm({ ...form, attendees: e.target.value })} required />
          </div>
          <div>
            <label className="label">Notas (opcional)</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={create.isPending} className="btn-primary flex-1">
              {create.isPending ? 'Creando...' : 'Crear reservación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Calendar View ────────────────────────────────────────────

function CalendarView({
  reservations, approve, update, areas, create,
}: { reservations: any[]; approve: any; update: any; areas: any[]; create: any }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [approveModal, setApproveModal] = useState<any>(null)
  const [createModal, setCreateModal] = useState<Date | null>(null)

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const startPad = (getDay(days[0]) + 6) % 7

  const resByDay = useMemo(() => {
    const map = new Map<string, any[]>()
    reservations.forEach((r) => {
      const key = format(new Date(r.startTime), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    })
    return map
  }, [reservations])

  const selectedDayReservations = selectedDay
    ? reservations.filter((r) => isSameDay(new Date(r.startTime), selectedDay))
    : []

  const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <button onClick={() => setCurrentMonth((m) => subMonths(m, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <h3 className="font-semibold text-gray-900 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h3>
          <button onClick={() => setCurrentMonth((m) => addMonths(m, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {[...Array(startPad)].map((_, i) => <div key={`pad-${i}`} className="h-20 border-r border-b border-gray-50" />)}
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayRes = resByDay.get(key) ?? []
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={key}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`h-20 p-1.5 border-r border-b border-gray-100 cursor-pointer transition-colors overflow-hidden
                  ${isSelected ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
              >
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-brand-600 text-white' : 'text-gray-700'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayRes.slice(0, 3).map((r) => (
                    <div key={r.id} className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white ${STATUS_DOT[r.status] ?? 'bg-gray-400'}`}>
                      {r.commonArea?.name ?? ''}
                    </div>
                  ))}
                  {dayRes.length > 3 && <p className="text-[10px] text-gray-400">+{dayRes.length - 3} más</p>}
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-5 py-2 border-t border-gray-100 flex flex-wrap gap-3">
          {Object.entries(RESERVATION_STATUS_LABEL).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[k]}`} />
              {v}
            </div>
          ))}
        </div>
      </div>

      {/* Day detail */}
      {selectedDay && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 text-sm capitalize">
              {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
              {' '}— {selectedDayReservations.length} reservación{selectedDayReservations.length !== 1 ? 'es' : ''}
            </h4>
            <button
              onClick={() => setCreateModal(selectedDay)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {selectedDayReservations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin reservaciones — haz clic en "Nueva" para crear una</p>
            ) : (
              selectedDayReservations.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[r.status]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{r.commonArea?.name}</p>
                    <p className="text-xs text-gray-500">
                      {fullName(r.user)} · {formatDate(r.startTime, 'HH:mm')} – {formatDate(r.endTime, 'HH:mm')} · {r.attendees} asistentes
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${RESERVATION_STATUS_COLOR[r.status]}`}>
                      {RESERVATION_STATUS_LABEL[r.status]}
                    </span>
                    {r.status === 'PENDING' && (
                      <button
                        onClick={() => setApproveModal(r)}
                        className="px-2 py-1 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Revisar
                      </button>
                    )}
                    {r.status === 'CONFIRMED' && (
                      <button
                        onClick={() => update.mutate({ reservationId: r.id, status: 'CANCELLED' })}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {approveModal && (
        <ApproveModal reservation={approveModal} approve={approve} onClose={() => setApproveModal(null)} />
      )}
      {createModal !== null && (
        <CreateReservationModal
          defaultDate={createModal}
          areas={areas}
          create={create}
          onClose={() => setCreateModal(null)}
        />
      )}
    </div>
  )
}

// ── Table View ───────────────────────────────────────────────

function TableView({ reservations, isLoading, update, approve, areas, create }: {
  reservations: any[]; isLoading: boolean; update: any; approve: any; areas: any[]; create: any
}) {
  const [approveModal, setApproveModal] = useState<any>(null)
  const [createModal, setCreateModal] = useState(false)

  return (
    <>
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">{reservations.length} reservación{reservations.length !== 1 ? 'es' : ''}</span>
          <button onClick={() => setCreateModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nueva reservación
          </button>
        </div>
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
                      <button
                        onClick={() => setApproveModal(r)}
                        className="px-2 py-1 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                      >
                        Revisar
                      </button>
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

      {approveModal && (
        <ApproveModal reservation={approveModal} approve={approve} onClose={() => setApproveModal(null)} />
      )}
      {createModal && (
        <CreateReservationModal defaultDate={null} areas={areas} create={create} onClose={() => setCreateModal(false)} />
      )}
    </>
  )
}

// ── Main Page ────────────────────────────────────────────────

export default function ReservationsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL')
  const [view, setView] = useState<'list' | 'calendar'>('calendar')
  const { data, isLoading } = useReservations(tab)
  const update = useUpdateReservation()
  const approve = useApproveReservation()
  const create = useCreateReservation()
  const { data: areasData } = useAreas()
  const reservations = Array.isArray(data) ? data : []
  const areas = Array.isArray(areasData) ? areasData : []

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservaciones</h1>
          <p className="text-gray-500 text-sm">Gestión de áreas comunes</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setView('calendar')}
            className={`p-1.5 rounded-md transition-colors ${view === 'calendar' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
            title="Vista calendario"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
            title="Vista lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
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

      {view === 'calendar' ? (
        <CalendarView
          reservations={reservations}
          approve={approve}
          update={update}
          areas={areas}
          create={create}
        />
      ) : (
        <TableView
          reservations={reservations}
          isLoading={isLoading}
          update={update}
          approve={approve}
          areas={areas}
          create={create}
        />
      )}
    </div>
  )
}
