'use client'
import { useState } from 'react'
import { useWorkOrders, useCreateWorkOrder, useUpdateWorkOrder, useStaff } from '@/hooks/useStaff'
import { formatDate, WORK_ORDER_STATUS_COLOR, WORK_ORDER_STATUS_LABEL, PRIORITY_COLOR, PRIORITY_LABEL, fullName } from '@/lib/utils'
import { Plus, ClipboardList, X } from 'lucide-react'

const TABS = ['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const

export default function WorkOrdersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading } = useWorkOrders(tab)
  const { data: staffData } = useStaff()
  const createWO = useCreateWorkOrder()
  const updateWO = useUpdateWorkOrder()
  const workOrders = Array.isArray(data) ? data : []
  const staff = Array.isArray(staffData) ? staffData : []

  const [form, setForm] = useState({
    title: '', description: '', category: 'maintenance', priority: 'MEDIUM',
    location: '', dueDate: '', assignedStaffId: '',
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createWO.mutateAsync(form)
    setShowCreate(false)
    setForm({ title: '', description: '', category: 'maintenance', priority: 'MEDIUM', location: '', dueDate: '', assignedStaffId: '' })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de Trabajo</h1>
          <p className="text-gray-500 text-sm">{workOrders.length} orden{workOrders.length !== 1 ? 'es' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> Nueva orden</button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'ALL' ? 'Todas' : WORK_ORDER_STATUS_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Título</th>
                <th className="table-th">Categoría</th>
                <th className="table-th">Prioridad</th>
                <th className="table-th">Ubicación</th>
                <th className="table-th">Asignado a</th>
                <th className="table-th">Vence</th>
                <th className="table-th">Estado</th>
                <th className="table-th">Cambiar estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={8} className="table-td text-center text-gray-400 py-8">Cargando...</td></tr>}
              {!isLoading && workOrders.length === 0 && (
                <tr><td colSpan={8} className="table-td text-center py-12">
                  <ClipboardList className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400">Sin órdenes de trabajo</p>
                </td></tr>
              )}
              {workOrders.map((wo: any) => (
                <tr key={wo.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{wo.title}</td>
                  <td className="table-td capitalize text-gray-500">{wo.category}</td>
                  <td className="table-td"><span className={`badge ${PRIORITY_COLOR[wo.priority]}`}>{PRIORITY_LABEL[wo.priority]}</span></td>
                  <td className="table-td text-gray-500">{wo.location ?? '—'}</td>
                  <td className="table-td">{wo.assignments?.[0] ? fullName(wo.assignments[0].staff?.user) : '—'}</td>
                  <td className="table-td text-gray-500">{formatDate(wo.dueDate)}</td>
                  <td className="table-td"><span className={`badge ${WORK_ORDER_STATUS_COLOR[wo.status]}`}>{WORK_ORDER_STATUS_LABEL[wo.status]}</span></td>
                  <td className="table-td">
                    <select
                      value={wo.status}
                      onChange={(e) => updateWO.mutate({ id: wo.id, body: { status: e.target.value } })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      {['OPEN','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED'].map((s) => (
                        <option key={s} value={s}>{WORK_ORDER_STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Nueva orden de trabajo</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div><label className="label">Título</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
              <div><label className="label">Descripción</label><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Categoría</label>
                  <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="maintenance">Mantenimiento</option>
                    <option value="cleaning">Limpieza</option>
                    <option value="security">Seguridad</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="label">Prioridad</label>
                  <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>
              </div>
              <div><label className="label">Ubicación</label><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Alberca, lobby, estacionamiento..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Fecha límite</label><input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
                <div>
                  <label className="label">Asignar a</label>
                  <select className="input" value={form.assignedStaffId} onChange={(e) => setForm({ ...form, assignedStaffId: e.target.value })}>
                    <option value="">Sin asignar</option>
                    {staff.map((s: any) => <option key={s.id} value={s.id}>{fullName(s.user)} — {s.position}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={createWO.isPending} className="btn-primary flex-1">{createWO.isPending ? 'Guardando...' : 'Crear orden'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
