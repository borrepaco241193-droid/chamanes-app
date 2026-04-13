'use client'
import { useState } from 'react'
import { usePayments, useMarkPaymentPaid, useDeletePayment, useCreatePayment, useUploadPaymentProof } from '@/hooks/usePayments'
import { useResidents, useUnits } from '@/hooks/useResidents'
import { formatDate, formatMoney, PAYMENT_STATUS_COLOR, PAYMENT_STATUS_LABEL, fullName } from '@/lib/utils'
import { Plus, Search, CheckCircle, Trash2, X, DollarSign, ImagePlus } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

const TABS = ['ALL', 'PENDING', 'COMPLETED', 'FAILED'] as const

export default function PaymentsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [markPaidId, setMarkPaidId] = useState<string | null>(null)
  const { activeCommunityId } = useAuthStore()

  const { data, isLoading } = usePayments(tab, search)
  const markPaid = useMarkPaymentPaid()
  const uploadProof = useUploadPaymentProof()
  const deletePayment = useDeletePayment()
  const createPayment = useCreatePayment()
  const { data: residentsData } = useResidents()
  const { data: unitsData } = useUnits()

  const payments = data?.payments ?? []
  const residents = residentsData?.residents ?? []
  const units = unitsData?.units ?? []

  const [form, setForm] = useState({
    userId: '', unitId: '', amount: '', description: '', type: 'MAINTENANCE_FEE',
    dueDate: '', periodMonth: '', periodYear: new Date().getFullYear().toString(),
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createPayment.mutateAsync({
      ...form,
      amount: parseFloat(form.amount),
      periodMonth: form.periodMonth ? parseInt(form.periodMonth) : undefined,
      periodYear: form.periodYear ? parseInt(form.periodYear) : undefined,
    })
    setShowCreate(false)
    setForm({ userId: '', unitId: '', amount: '', description: '', type: 'MAINTENANCE_FEE', dueDate: '', periodMonth: '', periodYear: new Date().getFullYear().toString() })
  }

  const tabCounts = {
    ALL: payments.length,
    PENDING: payments.filter((p: any) => p.status === 'PENDING').length,
    COMPLETED: payments.filter((p: any) => p.status === 'COMPLETED').length,
    FAILED: payments.filter((p: any) => p.status === 'FAILED').length,
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
          <p className="text-gray-500 text-sm">Cuotas de mantenimiento y cobros</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo pago
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {PAYMENT_STATUS_LABEL[t] ?? 'Todos'}
            {tabCounts[t as keyof typeof tabCounts] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t ? 'bg-brand-100 text-brand-700' : 'bg-gray-200 text-gray-600'}`}>
                {tabCounts[t as keyof typeof tabCounts]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Buscar por residente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Residente</th>
                <th className="table-th">Unidad</th>
                <th className="table-th">Descripción</th>
                <th className="table-th">Monto</th>
                <th className="table-th">Vencimiento</th>
                <th className="table-th">Período</th>
                <th className="table-th">Estado</th>
                <th className="table-th">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={8} className="table-td text-center text-gray-400 py-8">Cargando...</td></tr>
              )}
              {!isLoading && payments.length === 0 && (
                <tr><td colSpan={8} className="table-td text-center text-gray-400 py-8">
                  <DollarSign className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  No hay pagos para mostrar
                </td></tr>
              )}
              {payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td font-medium">{fullName(p.user)}</td>
                  <td className="table-td text-gray-500">{p.unit?.number}</td>
                  <td className="table-td">{p.description}</td>
                  <td className="table-td font-semibold">{formatMoney(p.amount, p.currency)}</td>
                  <td className="table-td">{formatDate(p.dueDate)}</td>
                  <td className="table-td text-gray-500">
                    {p.periodMonth && p.periodYear ? `${p.periodMonth}/${p.periodYear}` : '—'}
                  </td>
                  <td className="table-td">
                    <span className={`badge ${PAYMENT_STATUS_COLOR[p.status]}`}>
                      {PAYMENT_STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      {p.status === 'PENDING' && (
                        <button
                          onClick={() => setMarkPaidId(p.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Marcar como pagado"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm('¿Eliminar este pago?')) deletePayment.mutate(p.id) }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark Paid Modal */}
      {markPaidId && (
        <Modal title="Registrar pago" onClose={() => setMarkPaidId(null)}>
          <MarkPaidForm
            paymentId={markPaidId}
            onSubmit={(method, notes, transferProofUrl) => {
              markPaid.mutate({ paymentId: markPaidId, method, notes, transferProofUrl }, {
                onSuccess: () => setMarkPaidId(null),
              })
            }}
            uploadProof={uploadProof}
            loading={markPaid.isPending}
            onCancel={() => setMarkPaidId(null)}
          />
        </Modal>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Nuevo cargo" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Residente</label>
              <select className="input" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required>
                <option value="">Seleccionar...</option>
                {residents.map((r: any) => (
                  <option key={r.id} value={r.id}>{fullName(r.user)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Unidad</label>
              <select className="input" value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} required>
                <option value="">Seleccionar...</option>
                {units.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.number}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Monto (MXN)</label>
                <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="MAINTENANCE_FEE">Cuota mantenimiento</option>
                  <option value="FINE">Multa</option>
                  <option value="RESERVATION_FEE">Cuota reservación</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Descripción</label>
              <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Vencimiento</label>
                <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div>
                <label className="label">Mes</label>
                <input className="input" type="number" min="1" max="12" placeholder="1-12" value={form.periodMonth} onChange={(e) => setForm({ ...form, periodMonth: e.target.value })} />
              </div>
              <div>
                <label className="label">Año</label>
                <input className="input" type="number" value={form.periodYear} onChange={(e) => setForm({ ...form, periodYear: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" disabled={createPayment.isPending} className="btn-primary flex-1">
                {createPayment.isPending ? 'Guardando...' : 'Crear cargo'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function MarkPaidForm({ paymentId, onSubmit, uploadProof, loading, onCancel }: {
  paymentId: string
  onSubmit: (method: string, notes: string, transferProofUrl?: string) => void
  uploadProof: any
  loading: boolean
  onCancel: () => void
}) {
  const [method, setMethod] = useState('CASH')
  const [notes, setNotes] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProofFile(file)
    setProofPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    let proofUrl: string | undefined
    if (proofFile) {
      setUploading(true)
      try {
        const result = await uploadProof.mutateAsync({ paymentId, file: proofFile })
        proofUrl = result?.proofUrl ?? result?.url
      } finally {
        setUploading(false)
      }
    }
    onSubmit(method, notes, proofUrl)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Método de pago</label>
        <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="CASH">Efectivo</option>
          <option value="TRANSFER">Transferencia</option>
          <option value="CHECK">Cheque</option>
        </select>
      </div>
      <div>
        <label className="label">Notas (opcional)</label>
        <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Número de recibo, referencia..." />
      </div>
      <div>
        <label className="label">Comprobante de pago (opcional)</label>
        <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-brand-400 transition-colors">
          <ImagePlus className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-500">{proofFile ? proofFile.name : 'Subir foto o captura de pantalla'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>
        {proofPreview && (
          <div className="mt-2 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proofPreview} alt="Comprobante" className="w-full h-32 object-cover rounded-lg border border-gray-200" />
            <button
              type="button"
              onClick={() => { setProofFile(null); setProofPreview(null) }}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
        <button onClick={handleSubmit} disabled={loading || uploading} className="btn-primary flex-1">
          {uploading ? 'Subiendo...' : loading ? 'Guardando...' : 'Confirmar pago'}
        </button>
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
