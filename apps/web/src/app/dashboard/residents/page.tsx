'use client'
import { useState } from 'react'
import { useResidents, useCreateResident, useDeleteResident, useUnits, useUpdateResident, useChangeRole } from '@/hooks/useResidents'
import { fullName, formatDate, ROLE_LABEL, ID_STATUS_COLOR, ID_STATUS_LABEL } from '@/lib/utils'
import { Plus, Search, UserX, X, Users, Mail, Shield } from 'lucide-react'
import Image from 'next/image'

const ROLE_OPTIONS = [
  { value: 'RESIDENT', label: 'Residente' },
  { value: 'COMMUNITY_ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'GUARD', label: 'Guardia' },
  { value: 'STAFF', label: 'Técnico' },
]

export default function ResidentsPage() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)
  const { data, isLoading } = useResidents(search)
  const { data: unitsData } = useUnits()
  const deleteResident = useDeleteResident()
  const createResident = useCreateResident()
  const updateResident = useUpdateResident()
  const changeRole = useChangeRole()
  const residents = data?.residents ?? []

  const [editEmailResident, setEditEmailResident] = useState<{ id: string; name: string; email: string } | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [changeRoleResident, setChangeRoleResident] = useState<{ id: string; name: string; role: string } | null>(null)
  const [newRole, setNewRole] = useState('')

  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!changeRoleResident) return
    await changeRole.mutateAsync({ userId: changeRoleResident.id, role: newRole })
    setChangeRoleResident(null)
    setNewRole('')
  }
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editEmailResident) return
    await updateResident.mutateAsync({ userId: editEmailResident.id, body: { email: newEmail } })
    setEditEmailResident(null)
    setNewEmail('')
  }
  const units = unitsData?.units ?? []

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', role: 'RESIDENT',
    unitId: '', occupancyType: 'OWNER', isPrimary: true,
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await createResident.mutateAsync({
      ...form,
      unitId: form.unitId || undefined,
    })
    const pwd = result?.data?.tempPassword ?? result?.tempPassword
    if (pwd) setCreatedPassword(pwd)
    else setShowCreate(false)
    setForm({ firstName: '', lastName: '', email: '', phone: '', role: 'RESIDENT', unitId: '', occupancyType: 'OWNER', isPrimary: true })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Residentes</h1>
          <p className="text-gray-500 text-sm">{residents.length} registrado{residents.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Agregar residente
        </button>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Buscar por nombre o email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Residente</th>
                <th className="table-th">Email</th>
                <th className="table-th">Teléfono</th>
                <th className="table-th">Unidad</th>
                <th className="table-th">Rol</th>
                <th className="table-th">Verificación ID</th>
                <th className="table-th">Desde</th>
                <th className="table-th">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={8} className="table-td text-center text-gray-400 py-8">Cargando...</td></tr>
              )}
              {!isLoading && residents.length === 0 && (
                <tr><td colSpan={8} className="table-td text-center py-12">
                  <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400">No hay residentes registrados</p>
                </td></tr>
              )}
              {residents.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      {r.user?.avatarUrl
                        ? <Image src={r.user.avatarUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                        : <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700">
                          {r.user?.firstName?.[0]}{r.user?.lastName?.[0]}
                        </div>
                      }
                      <span className="font-medium">{fullName(r.user)}</span>
                    </div>
                  </td>
                  <td className="table-td text-gray-500">{r.user?.email ?? '—'}</td>
                  <td className="table-td text-gray-500">{r.phone ?? r.user?.phone ?? '—'}</td>
                  <td className="table-td">
                    {r.units?.length > 0
                      ? r.units.map((u: any) => (
                        <span key={u.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 mr-1">
                          {u.number} {u.isPrimary && '★'}
                        </span>
                      ))
                      : <span className="text-gray-400">—</span>
                    }
                  </td>
                  <td className="table-td">
                    <span className="badge bg-blue-100 text-blue-800">{ROLE_LABEL[r.role] ?? r.role}</span>
                  </td>
                  <td className="table-td">
                    <span className={`badge ${ID_STATUS_COLOR[r.user?.idVerificationStatus ?? 'NOT_SUBMITTED']}`}>
                      {ID_STATUS_LABEL[r.user?.idVerificationStatus ?? 'NOT_SUBMITTED']}
                    </span>
                  </td>
                  <td className="table-td text-gray-500">{formatDate(r.joinedAt)}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setChangeRoleResident({ id: r.id, name: fullName(r.user), role: r.role ?? 'RESIDENT' }); setNewRole(r.role ?? 'RESIDENT') }}
                        className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Cambiar rol"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditEmailResident({ id: r.id, name: fullName(r.user), email: r.user?.email ?? '' }); setNewEmail(r.user?.email ?? '') }}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Cambiar correo"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`¿Desactivar a ${fullName(r.user)}?`)) deleteResident.mutate(r.id) }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Desactivar residente"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Agregar residente" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Nombre</label><input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
              <div><label className="label">Apellido</label><input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
            </div>
            <div><label className="label">Correo electrónico</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div><label className="label">Teléfono</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Rol</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="RESIDENT">Residente</option>
                  <option value="MANAGER">Manager</option>
                  <option value="COMMUNITY_ADMIN">Administrador</option>
                  <option value="GUARD">Guardia</option>
                  <option value="STAFF">Personal</option>
                </select>
              </div>
              <div>
                <label className="label">Unidad (opcional)</label>
                <select className="input" value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {units.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.number}{u.block ? ` · Bloque ${u.block}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" disabled={createResident.isPending} className="btn-primary flex-1">
                {createResident.isPending ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit email modal */}
      {editEmailResident && (
        <Modal title={`Cambiar correo — ${editEmailResident.name}`} onClose={() => { setEditEmailResident(null); setNewEmail('') }}>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label className="label">Correo actual</label>
              <p className="text-sm text-gray-500 mt-1">{editEmailResident.email || '—'}</p>
            </div>
            <div>
              <label className="label">Nuevo correo electrónico</label>
              <input className="input" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setEditEmailResident(null); setNewEmail('') }} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" disabled={updateResident.isPending} className="btn-primary flex-1">
                {updateResident.isPending ? 'Guardando...' : 'Actualizar correo'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change role modal */}
      {changeRoleResident && (
        <Modal title={`Cambiar rol — ${changeRoleResident.name}`} onClose={() => { setChangeRoleResident(null); setNewRole('') }}>
          <form onSubmit={handleChangeRole} className="space-y-4">
            <div>
              <label className="label">Rol actual</label>
              <p className="text-sm text-gray-500 mt-1">{ROLE_LABEL[changeRoleResident.role] ?? changeRoleResident.role}</p>
            </div>
            <div>
              <label className="label">Nuevo rol</label>
              <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setChangeRoleResident(null); setNewRole('') }} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" disabled={changeRole.isPending || newRole === changeRoleResident.role} className="btn-primary flex-1">
                {changeRole.isPending ? 'Guardando...' : 'Cambiar rol'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Temp password modal */}
      {createdPassword && (
        <Modal title="Residente creado" onClose={() => { setCreatedPassword(null); setShowCreate(false) }}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">El residente fue creado exitosamente. Comparte esta contraseña temporal:</p>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
              <p className="text-xs text-blue-600 mb-1">Contraseña temporal</p>
              <code className="text-xl font-bold text-blue-900 tracking-widest">{createdPassword}</code>
            </div>
            <p className="text-xs text-gray-400">El residente deberá cambiarla en su primer inicio de sesión.</p>
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
