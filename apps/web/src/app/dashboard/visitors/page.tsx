'use client'
import { useState } from 'react'
import { useVisitorPasses, useCreateVisitorPass, useRevokeVisitorPass } from '@/hooks/useStaff'
import { useResidents } from '@/hooks/useResidents'
import { formatDateTime, fullName } from '@/lib/utils'
import { QrCode, X, Plus, Ban } from 'lucide-react'

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  USED: 'bg-blue-100 text-blue-800',
  EXPIRED: 'bg-gray-100 text-gray-500',
  REVOKED: 'bg-red-100 text-red-800',
}
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo', USED: 'Usado', EXPIRED: 'Vencido', REVOKED: 'Revocado',
}

const TABS = ['ALL', 'ACTIVE', 'USED', 'EXPIRED', 'REVOKED'] as const

export default function VisitorsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL')
  const [qrModal, setQrModal] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading } = useVisitorPasses(tab)
  const createPass = useCreateVisitorPass()
  const revokePass = useRevokeVisitorPass()
  const { data: residentsData } = useResidents()
  const passes = Array.isArray(data) ? data : []
  const residents = residentsData?.residents ?? []

  const now = new Date()
  const defaultFrom = now.toISOString().slice(0, 16)
  const defaultUntil = new Date(now.getTime() + 24 * 3600000).toISOString().slice(0, 16)

  const [form, setForm] = useState({
    visitorName: '', visitorPhone: '', plateNumber: '',
    validFrom: defaultFrom, validUntil: defaultUntil,
    maxUses: '1', notes: '', hostUserId: '',
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createPass.mutateAsync({
      ...form,
      maxUses: parseInt(form.maxUses),
      validFrom: new Date(form.validFrom).toISOString(),
      validUntil: new Date(form.validUntil).toISOString(),
    })
    setShowCreate(false)
    setForm({ visitorName: '', visitorPhone: '', plateNumber: '', validFrom: defaultFrom, validUntil: defaultUntil, maxUses: '1', notes: '', hostUserId: '' })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pases de Visitante</h1>
          <p className="text-gray-500 text-sm">Códigos QR de acceso</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> Nuevo pase</button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'ALL' ? 'Todos' : STATUS_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Visitante</th>
                <th className="table-th">Generado por</th>
                <th className="table-th">Teléfono</th>
                <th className="table-th">Placa</th>
                <th className="table-th">Válido desde</th>
                <th className="table-th">Válido hasta</th>
                <th className="table-th">Usos</th>
                <th className="table-th">Estado</th>
                <th className="table-th">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={9} className="table-td text-center text-gray-400 py-8">Cargando...</td></tr>}
              {!isLoading && passes.length === 0 && (
                <tr><td colSpan={9} className="table-td text-center py-12">
                  <QrCode className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400">No hay pases registrados</p>
                </td></tr>
              )}
              {passes.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{p.visitorName}</td>
                  <td className="table-td text-gray-500">{fullName(p.createdBy)}</td>
                  <td className="table-td text-gray-500">{p.visitorPhone ?? '—'}</td>
                  <td className="table-td text-gray-500">{p.plateNumber ?? '—'}</td>
                  <td className="table-td text-gray-500">{formatDateTime(p.validFrom)}</td>
                  <td className="table-td text-gray-500">{formatDateTime(p.validUntil)}</td>
                  <td className="table-td text-center">{p.usedCount}/{p.maxUses}</td>
                  <td className="table-td"><span className={`badge ${STATUS_COLOR[p.status]}`}>{STATUS_LABEL[p.status]}</span></td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      {p.qrCodeImageUrl && (
                        <button onClick={() => setQrModal(p)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg" title="Ver QR">
                          <QrCode className="w-4 h-4" />
                        </button>
                      )}
                      {p.status === 'ACTIVE' && (
                        <button onClick={() => { if (confirm('¿Revocar este pase?')) revokePass.mutate(p.id) }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Revocar">
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <Modal title="Nuevo pase de visitante" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div><label className="label">Nombre del visitante</label><input className="input" value={form.visitorName} onChange={(e) => setForm({ ...form, visitorName: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Teléfono (opcional)</label><input className="input" value={form.visitorPhone} onChange={(e) => setForm({ ...form, visitorPhone: e.target.value })} /></div>
              <div><label className="label">Placa (opcional)</label><input className="input" value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} /></div>
            </div>
            <div>
              <label className="label">Residente anfitrión</label>
              <select className="input" value={form.hostUserId} onChange={(e) => setForm({ ...form, hostUserId: e.target.value })}>
                <option value="">Sin residente específico</option>
                {residents.map((r: any) => <option key={r.id} value={r.id}>{fullName(r.user)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Válido desde</label><input className="input" type="datetime-local" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} required /></div>
              <div><label className="label">Válido hasta</label><input className="input" type="datetime-local" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} required /></div>
            </div>
            <div><label className="label">Usos máximos</label><input className="input" type="number" min="1" max="10" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} /></div>
            <div><label className="label">Notas (opcional)</label><input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" disabled={createPass.isPending} className="btn-primary flex-1">{createPass.isPending ? 'Creando...' : 'Crear pase'}</button>
            </div>
          </form>
        </Modal>
      )}

      {qrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setQrModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">QR — {qrModal.visitorName}</h3>
              <button onClick={() => setQrModal(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <img src={qrModal.qrCodeImageUrl} alt="QR Code" className="w-64 h-64 object-contain mx-auto" />
            <p className="text-xs text-gray-400 mt-3">Válido hasta: {formatDateTime(qrModal.validUntil)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
