'use client'
import { useState } from 'react'
import { useWorkOrders, useCreateWorkOrder, useUpdateWorkOrder, useStaff } from '@/hooks/useStaff'
import { formatDate, WORK_ORDER_STATUS_COLOR, WORK_ORDER_STATUS_LABEL, PRIORITY_COLOR, PRIORITY_LABEL, fullName } from '@/lib/utils'
import { Plus, ClipboardList, X, Camera, User, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const TABS = ['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const

function useAssignWorkOrder() {
  const qc = useQueryClient()
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const fallbackId = activeCommunityId ?? activeCommunityIds[0]
  return useMutation({
    mutationFn: ({ orderId, staffId, communityId }: { orderId: string; staffId: string; communityId?: string }) =>
      api.post(`/communities/${communityId ?? fallbackId}/work-orders/${orderId}/assign`, { staffId }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workorders'] }),
  })
}

// ── Detail Modal ───────────────────────────────────────────────

function DetailModal({ wo, staff, onClose }: { wo: any; staff: any[]; onClose: () => void }) {
  const [photoModal, setPhotoModal] = useState<string | null>(null)
  const [assignId, setAssignId] = useState('')
  const assignWO = useAssignWorkOrder()
  const updateWO = useUpdateWorkOrder()

  const currentAssignee = wo.assignments?.[0]
  const photos: string[] = wo.imageUrls ?? []

  const handleAssign = async () => {
    if (!assignId) return
    await assignWO.mutateAsync({ orderId: wo.id, staffId: assignId, communityId: wo.communityId })
    setAssignId('')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-200">
          <div className="flex-1 mr-4">
            <h3 className="font-bold text-gray-900 text-lg">{wo.title}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`badge ${WORK_ORDER_STATUS_COLOR[wo.status]}`}>{WORK_ORDER_STATUS_LABEL[wo.status]}</span>
              <span className={`badge ${PRIORITY_COLOR[wo.priority]}`}>{PRIORITY_LABEL[wo.priority]}</span>
              <span className="text-xs text-gray-400 capitalize">{wo.category}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Descripción</p>
            <p className="text-gray-700 text-sm">{wo.description}</p>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {wo.location && <div><span className="text-gray-500">Ubicación: </span><span className="text-gray-900">{wo.location}</span></div>}
            {wo.dueDate && <div><span className="text-gray-500">Vence: </span><span className="text-gray-900">{formatDate(wo.dueDate)}</span></div>}
            <div><span className="text-gray-500">Creado: </span><span className="text-gray-900">{formatDate(wo.createdAt)}</span></div>
            {wo.completedAt && <div><span className="text-gray-500">Completado: </span><span className="text-gray-900">{formatDate(wo.completedAt)}</span></div>}
          </div>

          {/* Assignment */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Asignación</p>
            {currentAssignee ? (
              <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                <User className="w-4 h-4 text-violet-500" />
                <span className="font-medium">{fullName(currentAssignee.staff?.user) || currentAssignee.staff?.position || '—'}</span>
                <span className="text-gray-400 text-xs">· {currentAssignee.staff?.position}</span>
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-2">Sin asignar</p>
            )}
            {wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED' && (
              <div className="flex gap-2">
                <select className="input flex-1 text-sm" value={assignId} onChange={(e) => setAssignId(e.target.value)}>
                  <option value="">{currentAssignee ? 'Reasignar a...' : 'Seleccionar personal...'}</option>
                  {staff.map((s: any) => <option key={s.id} value={s.id}>{fullName(s.user)} — {s.position}</option>)}
                </select>
                <button onClick={handleAssign} disabled={!assignId || assignWO.isPending} className="btn-primary text-sm px-4">
                  {assignWO.isPending ? '...' : 'Asignar'}
                </button>
              </div>
            )}
          </div>

          {/* Priority + Status change */}
          {wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Prioridad</p>
                <div className="flex gap-1 flex-wrap">
                  {[
                    { value: 'LOW',    label: 'Baja',    cls: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
                    { value: 'MEDIUM', label: 'Media',   cls: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
                    { value: 'HIGH',   label: 'Alta',    cls: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
                    { value: 'URGENT', label: 'Urgente', cls: 'bg-red-100 text-red-700 hover:bg-red-200' },
                  ].map((p) => (
                    <button
                      key={p.value}
                      onClick={() => updateWO.mutate({ id: wo.id, communityId: wo.communityId, body: { priority: p.value } })}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${p.cls} ${wo.priority === p.value ? 'ring-2 ring-offset-1 ring-current' : ''}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Estado</p>
                <select
                  value={wo.status}
                  onChange={(e) => updateWO.mutate({ id: wo.id, communityId: wo.communityId, body: { status: e.target.value } })}
                  className="input text-sm"
                >
                  {['OPEN','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED'].map((s) => (
                    <option key={s} value={s}>{WORK_ORDER_STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Photos */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Fotos del personal {photos.length > 0 && `(${photos.length})`}
            </p>
            {photos.length === 0 ? (
              <div className="h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center gap-2 text-gray-400">
                <Camera className="w-5 h-5" />
                <span className="text-sm">El personal aún no ha subido fotos</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {photos.map((url, i) => (
                  <button key={i} onClick={() => setPhotoModal(url)} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Foto ${i + 1}`} className="w-24 h-24 object-cover rounded-xl border border-gray-200 hover:opacity-90 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          {wo.comments && wo.comments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Comentarios ({wo.comments.length})
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {wo.comments.map((c: any) => (
                  <div key={c.id} className="bg-gray-50 rounded-xl p-3 text-sm">
                    <p className="text-gray-700">{c.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(c.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Photo lightbox */}
      {photoModal && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setPhotoModal(null)}>
          <button onClick={() => setPhotoModal(null)} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X className="w-8 h-8" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoModal} alt="Foto" className="max-w-full max-h-[85vh] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────

export default function WorkOrdersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [detailWO, setDetailWO] = useState<any | null>(null)
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
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de Trabajo / Tareas</h1>
          <p className="text-gray-500 text-sm">{workOrders.length} orden{workOrders.length !== 1 ? 'es' : ''} · Haz clic en una fila para ver fotos y detalles</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> Nueva tarea</button>
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
                <th className="table-th">Asignado a</th>
                <th className="table-th">Fotos</th>
                <th className="table-th">Vence</th>
                <th className="table-th">Estado</th>
                <th className="table-th">Acción</th>
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
                <tr key={wo.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDetailWO(wo)}>
                  <td className="table-td font-medium">
                    <div className="flex items-center gap-1">
                      {wo.title}
                      <ChevronRight className="w-3 h-3 text-gray-300" />
                    </div>
                  </td>
                  <td className="table-td capitalize text-gray-500">{wo.category}</td>
                  <td className="table-td"><span className={`badge ${PRIORITY_COLOR[wo.priority]}`}>{PRIORITY_LABEL[wo.priority]}</span></td>
                  <td className="table-td">
                    {wo.assignments?.[0] ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-[9px] font-bold text-violet-700">
                          {fullName(wo.assignments[0].staff?.user)?.[0] ?? '?'}
                        </div>
                        <span className="text-sm">{fullName(wo.assignments[0].staff?.user) || wo.assignments[0].staff?.position || '—'}</span>
                      </div>
                    ) : <span className="text-gray-400 text-sm">—</span>}
                  </td>
                  <td className="table-td">
                    {(wo.imageUrls?.length ?? 0) > 0 ? (
                      <div className="flex items-center gap-1 text-brand-600">
                        <Camera className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{wo.imageUrls.length}</span>
                      </div>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="table-td text-gray-500">{formatDate(wo.dueDate)}</td>
                  <td className="table-td"><span className={`badge ${WORK_ORDER_STATUS_COLOR[wo.status]}`}>{WORK_ORDER_STATUS_LABEL[wo.status]}</span></td>
                  <td className="table-td" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={wo.status}
                      onChange={(e) => updateWO.mutate({ id: wo.id, communityId: wo.communityId, body: { status: e.target.value } })}
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

      {/* Detail Modal */}
      {detailWO && <DetailModal wo={detailWO} staff={staff} onClose={() => setDetailWO(null)} />}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Nueva tarea / orden de trabajo</h3>
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
                  <div className="flex gap-1 mt-1">
                    {[
                      { value: 'LOW',    label: 'Baja',    cls: 'bg-gray-100 text-gray-600' },
                      { value: 'MEDIUM', label: 'Media',   cls: 'bg-amber-100 text-amber-700' },
                      { value: 'HIGH',   label: 'Alta',    cls: 'bg-orange-100 text-orange-700' },
                      { value: 'URGENT', label: '🚨 Urgente', cls: 'bg-red-100 text-red-700' },
                    ].map((p) => (
                      <button type="button" key={p.value}
                        onClick={() => setForm({ ...form, priority: p.value })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${p.cls} ${form.priority === p.value ? 'ring-2 ring-offset-1 ring-current scale-105' : 'opacity-60 hover:opacity-100'}`}
                      >{p.label}</button>
                    ))}
                  </div>
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
                <button type="submit" disabled={createWO.isPending} className="btn-primary flex-1">{createWO.isPending ? 'Guardando...' : 'Crear tarea'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
