'use client'
import { useState } from 'react'
import { usePayments, useMarkPaymentPaid, useDeletePayment, useCreatePayment, useUploadPaymentProof } from '@/hooks/usePayments'
import { useResidents, useUnits } from '@/hooks/useResidents'
import { formatDate, formatMoney, PAYMENT_STATUS_COLOR, PAYMENT_STATUS_LABEL, fullName } from '@/lib/utils'
import { Plus, Search, CheckCircle, Trash2, X, DollarSign, ImagePlus } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const TABS = ['ALL', 'PENDING', 'COMPLETED', 'FAILED'] as const

const STATUS_BADGE: Record<string, any> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  FAILED: 'destructive',
}

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

  const [createError, setCreateError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    const { userId: _userId, ...rest } = form
    try {
      await createPayment.mutateAsync({
        ...rest,
        amount: parseFloat(form.amount),
        periodMonth: form.periodMonth ? parseInt(form.periodMonth) : undefined,
        periodYear: form.periodYear ? parseInt(form.periodYear) : undefined,
        dueDate: form.dueDate || undefined,
      })
      setShowCreate(false)
      setForm({ userId: '', unitId: '', amount: '', description: '', type: 'MAINTENANCE_FEE', dueDate: '', periodMonth: '', periodYear: new Date().getFullYear().toString() })
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? err?.response?.data?.error ?? 'Error al crear el cargo')
    }
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
          <h1 className="text-2xl font-bold text-foreground">Pagos</h1>
          <p className="text-muted-foreground text-sm">Cuotas de mantenimiento y cobros</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo pago
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t}>
              {PAYMENT_STATUS_LABEL[t] ?? 'Todos'}
              {tabCounts[t as keyof typeof tabCounts] > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0 h-4">
                  {tabCounts[t as keyof typeof tabCounts]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por residente..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Residente</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Cargando...</TableCell></TableRow>
            )}
            {!isLoading && payments.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                <DollarSign className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                No hay pagos para mostrar
              </TableCell></TableRow>
            )}
            {payments.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{fullName(p.user)}</TableCell>
                <TableCell className="text-muted-foreground">{p.unit?.number}</TableCell>
                <TableCell>{p.description}</TableCell>
                <TableCell className="font-semibold">{formatMoney(p.amount, p.currency)}</TableCell>
                <TableCell>{formatDate(p.dueDate)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.periodMonth && p.periodYear ? `${p.periodMonth}/${p.periodYear}` : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[p.status] ?? 'secondary'}>
                    {PAYMENT_STATUS_LABEL[p.status]}
                  </Badge>
                </TableCell>
                <TableCell>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Mark Paid Modal */}
      <Dialog open={!!markPaidId} onOpenChange={(open) => { if (!open) setMarkPaidId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
          </DialogHeader>
          {markPaidId && (
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
          )}
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo cargo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Residente</label>
              <select className="input" value={form.userId} onChange={(e) => {
                const userId = e.target.value
                const selectedResident = residents.find((r: any) => r.id === userId)
                const autoUnitId = selectedResident?.units?.[0]?.id ?? ''
                setForm({ ...form, userId, unitId: autoUnitId })
              }} required>
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
                <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
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
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Vencimiento</label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div>
                <label className="label">Mes</label>
                <Input type="number" min="1" max="12" placeholder="1-12" value={form.periodMonth} onChange={(e) => setForm({ ...form, periodMonth: e.target.value })} />
              </div>
              <div>
                <label className="label">Año</label>
                <Input type="number" value={form.periodYear} onChange={(e) => setForm({ ...form, periodYear: e.target.value })} />
              </div>
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowCreate(false); setCreateError('') }}>Cancelar</Button>
              <Button type="submit" disabled={createPayment.isPending} className="flex-1">
                {createPayment.isPending ? 'Guardando...' : 'Crear cargo'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
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
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Número de recibo, referencia..." />
      </div>
      <div>
        <label className="label">Comprobante de pago (opcional)</label>
        <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
          <ImagePlus className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{proofFile ? proofFile.name : 'Subir foto o captura de pantalla'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>
        {proofPreview && (
          <div className="mt-2 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proofPreview} alt="Comprobante" className="w-full h-32 object-cover rounded-lg border border-border" />
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
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={loading || uploading}>
          {uploading ? 'Subiendo...' : loading ? 'Guardando...' : 'Confirmar pago'}
        </Button>
      </div>
    </div>
  )
}
