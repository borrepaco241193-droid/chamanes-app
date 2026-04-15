'use client'
import { useStaff, useCreateStaff, useDeleteStaff } from '@/hooks/useStaff'
import { useAuthStore } from '@/store/auth.store'
import { fullName, formatDate } from '@/lib/utils'
import { UserCog, Plus, X, UserX } from 'lucide-react'
import { useState } from 'react'

const STAFF_ROLES = [
  { value: 'GUARD', label: 'Guardia' },
  { value: 'STAFF', label: 'Personal' },
  { value: 'MANAGER', label: 'Manager' },
]

export default function StaffPage() {
  const { data: staffData, isLoading } = useStaff()
  const staff = Array.isArray(staffData) ? staffData : []
  const createStaff = useCreateStaff()
  const deleteStaff = useDeleteStaff()
  const { user, activeCommunityId, activeCommunityIds } = useAuthStore()

  const communities = user?.communities ?? []
  const hasMultiple = communities.length > 1
  const defaultCommunityId = activeCommunityId ?? activeCommunityIds[0] ?? communities[0]?.id ?? ''

  const [showCreate, setShowCreate] = useState(false)
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'GUARD', communityId: defaultCommunityId })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await createStaff.mutateAsync(form)
    const pwd = result?.data?.tempPassword ?? result?.tempPassword
    if (pwd) setCreatedPassword(pwd)
    else setShowCreate(false)
    setForm({ firstName: '', lastName: '', email: '', phone: '', role: 'GUARD', communityId: defaultCommunityId })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personal</h1>
          <p className="text-gray-500 text-sm">{staff.length} empleado{staff.length !== 1 ? 's' : ''} registrado{staff.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> Agregar personal</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Empleado</th>
                <th className="table-th">Email</th>
                <th className="table-th">Puesto</th>
                <th className="table-th">Departamento</th>
                <th className="table-th">ID Empleado</th>
                <th className="table-th">Inicio</th>
                <th className="table-th">Estado</th>
                <th className="table-th">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={8} className="table-td text-center text-gray-400 py-8">Cargando...</td></tr>}
              {!isLoading && staff.length === 0 && (
                <tr><td colSpan={8} className="table-td text-center py-12">
                  <UserCog className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400">No hay personal registrado</p>
                </td></tr>
              )}
              {staff.map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                        {s.user?.firstName?.[0]}{s.user?.lastName?.[0]}
                      </div>
                      <span className="font-medium">{fullName(s.user)}</span>
                    </div>
                  </td>
                  <td className="table-td text-gray-500">{s.user?.email}</td>
                  <td className="table-td">{s.position ?? s.role ?? '—'}</td>
                  <td className="table-td text-gray-500">{s.department ?? '—'}</td>
                  <td className="table-td text-gray-500">{s.employeeId ?? '—'}</td>
                  <td className="table-td text-gray-500">{formatDate(s.startDate ?? s.joinedAt)}</td>
                  <td className="table-td">
                    <span className={`badge ${s.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                      {s.isActive !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="table-td">
                    <button
                      onClick={() => { if (confirm(`¿Desactivar a ${fullName(s.user)}?`)) deleteStaff.mutate(s.id) }}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Desactivar"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <Modal title="Agregar personal" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {hasMultiple && (
              <div>
                <label className="label">Residencial</label>
                <select className="input" value={form.communityId} onChange={(e) => setForm({ ...form, communityId: e.target.value })} required>
                  <option value="">Selecciona un residencial...</option>
                  {communities.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Nombre</label><input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
              <div><label className="label">Apellido</label><input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
            </div>
            <div><label className="label">Correo electrónico</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div><label className="label">Teléfono</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div>
              <label className="label">Rol</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {STAFF_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" disabled={createStaff.isPending} className="btn-primary flex-1">
                {createStaff.isPending ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {createdPassword && (
        <Modal title="Personal agregado" onClose={() => { setCreatedPassword(null); setShowCreate(false) }}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">El usuario fue creado. Comparte esta contraseña temporal:</p>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
              <p className="text-xs text-blue-600 mb-1">Contraseña temporal</p>
              <code className="text-xl font-bold text-blue-900 tracking-widest">{createdPassword}</code>
            </div>
            <button onClick={() => { setCreatedPassword(null); setShowCreate(false) }} className="btn-primary w-full">Entendido</button>
          </div>
        </Modal>
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
