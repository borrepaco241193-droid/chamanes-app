'use client'
import { useState } from 'react'
import { useAreas, useCreateArea, useUpdateArea, useDeleteArea } from '@/hooks/useReservations'
import { MapPin, Plus, Edit2, Trash2, X, Clock, Users } from 'lucide-react'

export default function AreasPage() {
  const { data, isLoading } = useAreas()
  const createArea = useCreateArea()
  const updateArea = useUpdateArea()
  const deleteArea = useDeleteArea()
  const areas = Array.isArray(data) ? data : []
  const [showCreate, setShowCreate] = useState(false)
  const [editArea, setEditArea] = useState<any>(null)

  const emptyForm = {
    name: '', description: '', capacity: '', openTime: '08:00', closeTime: '22:00',
    slotDurationMins: 60, requiresApproval: false, hasFee: false, feeAmount: '',
    rules: '',
  }
  const [form, setForm] = useState(emptyForm)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createArea.mutateAsync({ ...form, capacity: form.capacity ? parseInt(form.capacity) : undefined, feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : 0 })
    setShowCreate(false)
    setForm(emptyForm)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateArea.mutateAsync({ areaId: editArea.id, body: { ...form, capacity: form.capacity ? parseInt(form.capacity) : undefined, feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : 0 } })
    setEditArea(null)
  }

  const openEdit = (a: any) => {
    setForm({ name: a.name, description: a.description ?? '', capacity: a.capacity ?? '', openTime: a.openTime, closeTime: a.closeTime, slotDurationMins: a.slotDurationMins, requiresApproval: a.requiresApproval, hasFee: a.hasFee, feeAmount: a.feeAmount ?? '', rules: a.rules ?? '' })
    setEditArea(a)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Áreas Comunes</h1>
          <p className="text-gray-500 text-sm">{areas.length} área{areas.length !== 1 ? 's' : ''} registrada{areas.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> Nueva área</button>
      </div>

      {isLoading && <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="card p-5 h-36 animate-pulse bg-gray-100" />)}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {areas.map((a: any) => (
          <div key={a.id} className="card p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{a.name}</h3>
                {a.description && <p className="text-sm text-gray-500 mt-0.5">{a.description}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(a)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => { if (confirm(`¿Eliminar ${a.name}?`)) deleteArea.mutate(a.id) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {a.capacity && <span className="flex items-center gap-1 text-gray-500"><Users className="w-3 h-3" /> {a.capacity} personas</span>}
              <span className="flex items-center gap-1 text-gray-500"><Clock className="w-3 h-3" /> {a.openTime}–{a.closeTime}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {a.requiresApproval && <span className="badge bg-yellow-100 text-yellow-800">Requiere aprobación</span>}
              {a.hasFee && <span className="badge bg-blue-100 text-blue-800">${Number(a.feeAmount).toFixed(0)} MXN</span>}
              <span className={`badge ${a.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>{a.isActive ? 'Activa' : 'Inactiva'}</span>
            </div>
          </div>
        ))}

        {!isLoading && areas.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-400">
            <MapPin className="w-10 h-10 text-gray-200 mb-3" />
            <p>No hay áreas comunes registradas</p>
          </div>
        )}
      </div>

      {(showCreate || editArea) && (
        <AreaModal
          title={editArea ? 'Editar área' : 'Nueva área común'}
          form={form}
          setForm={setForm}
          onSubmit={editArea ? handleUpdate : handleCreate}
          loading={createArea.isPending || updateArea.isPending}
          onClose={() => { setShowCreate(false); setEditArea(null); setForm(emptyForm) }}
        />
      )}
    </div>
  )
}

function AreaModal({ title, form, setForm, onSubmit, loading, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div><label className="label">Nombre del área</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><label className="label">Descripción</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Capacidad</label><input className="input" type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
            <div><label className="label">Abre</label><input className="input" type="time" value={form.openTime} onChange={(e) => setForm({ ...form, openTime: e.target.value })} /></div>
            <div><label className="label">Cierra</label><input className="input" type="time" value={form.closeTime} onChange={(e) => setForm({ ...form, closeTime: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Duración de slot (min)</label><input className="input" type="number" value={form.slotDurationMins} onChange={(e) => setForm({ ...form, slotDurationMins: parseInt(e.target.value) })} /></div>
            <div><label className="label">Tarifa (MXN)</label><input className="input" type="number" min="0" step="0.01" value={form.feeAmount} onChange={(e) => setForm({ ...form, feeAmount: e.target.value, hasFee: parseFloat(e.target.value) > 0 })} /></div>
          </div>
          <div><label className="label">Reglas del área</label><textarea className="input" rows={3} value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} placeholder="Reglas de uso, restricciones..." /></div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.requiresApproval} onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })} className="rounded" />
              Requiere aprobación del admin
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
