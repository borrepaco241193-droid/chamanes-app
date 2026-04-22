'use client'
import { useState } from 'react'
import { useAllCommunities, useCreateCommunity } from '@/hooks/useCommunity'
import { useAuthStore } from '@/store/auth.store'
import { Building2, Plus, X, ShieldCheck, UserPlus, Copy, Check, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function CommunitiesPage() {
  const { user, setActiveCommunity, setAuth, tokens } = useAuthStore()
  const router = useRouter()
  const { data: communities, isLoading, refetch } = useAllCommunities()
  const create = useCreateCommunity()

  // Create community modal
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', city: '', state: '', country: 'MX', phone: '', email: '' })
  const [newCommunityId, setNewCommunityId] = useState<string | null>(null)

  // Invite admin modal
  const [inviteCommunityId, setInviteCommunityId] = useState<string | null>(null)
  const [inviteForm, setInviteForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'COMMUNITY_ADMIN' })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ tempPassword: string | null; email: string; isExistingUser: boolean } | null>(null)
  const [copied, setCopied] = useState(false)

  // Claim super admin
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState('')

  const isCommunityAdmin = user?.role === 'COMMUNITY_ADMIN' || user?.role === 'MANAGER' || user?.communityRole === 'COMMUNITY_ADMIN' || user?.communityRole === 'MANAGER'

  const handleClaimSuperAdmin = async () => {
    setClaiming(true)
    setClaimError('')
    try {
      const { data } = await api.post('/auth/claim-super-admin')
      setAuth(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken })
      router.refresh()
      window.location.reload()
    } catch (err: any) {
      setClaimError(err?.response?.data?.message ?? 'No se pudo reclamar el acceso')
    } finally {
      setClaiming(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await create.mutateAsync(form)
    setNewCommunityId((result as any).id ?? null)
    setShowCreate(false)
    setForm({ name: '', address: '', city: '', state: '', country: 'MX', phone: '', email: '' })
    // Automatically open invite modal for the new community
    setInviteCommunityId((result as any).id ?? null)
    setInviteResult(null)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCommunityId) return
    setInviteLoading(true)
    try {
      const { data } = await api.post(`/communities/${inviteCommunityId}/members/invite`, inviteForm)
      setInviteResult({ tempPassword: data.tempPassword, email: data.email, isExistingUser: data.isExistingUser })
      refetch()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al invitar administrador')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const closeInviteModal = () => {
    setInviteCommunityId(null)
    setInviteResult(null)
    setInviteForm({ firstName: '', lastName: '', email: '', phone: '', role: 'COMMUNITY_ADMIN' })
    setNewCommunityId(null)
  }

  const handleSelect = (id: string) => {
    setActiveCommunity(id)
    router.push('/dashboard')
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comunidades</h1>
          <p className="text-gray-500 text-sm">Gestión de comunidades del sistema</p>
        </div>
        {isCommunityAdmin ? (
          <div className="card p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Acceso de Super Admin</h2>
              <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
                Tienes rol de administrador de comunidad. Si eres el primer administrador del sistema, puedes reclamar acceso completo de Super Admin.
              </p>
            </div>
            {claimError && <p className="text-sm text-red-600">{claimError}</p>}
            <button onClick={handleClaimSuperAdmin} disabled={claiming} className="btn-primary mx-auto">
              {claiming ? 'Verificando...' : 'Reclamar acceso de Super Admin'}
            </button>
            <p className="text-xs text-gray-400">Solo funciona si no existe ningún Super Admin en el sistema.</p>
          </div>
        ) : (
          <div className="card p-8 text-center text-gray-400">Solo disponible para Super Admins.</div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comunidades</h1>
          <p className="text-gray-500 text-sm">{communities?.length ?? 0} comunidad{(communities?.length ?? 0) !== 1 ? 'es' : ''} registrada{(communities?.length ?? 0) !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nueva comunidad
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && [...Array(3)].map((_, i) => <div key={i} className="card p-6 h-36 animate-pulse bg-gray-100" />)}
        {communities?.map((c: any) => (
          <div key={c.id} className="card p-6 hover:shadow-md hover:border-brand-300 transition-all">
            <button onClick={() => handleSelect(c.id)} className="w-full text-left">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{c.city}, {c.state}</p>
                  <p className="text-sm text-gray-400 mt-1">{c.totalUnits} unidades</p>
                  <p className="text-xs text-gray-400 mt-1">Creada: {formatDate(c.createdAt)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
              </div>
            </button>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => { setInviteCommunityId(c.id); setInviteResult(null) }}
                className="w-full flex items-center justify-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Invitar administrador
              </button>
            </div>
          </div>
        ))}
        {!isLoading && (communities?.length ?? 0) === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-400">
            <Building2 className="w-10 h-10 text-gray-200 mb-3" />
            <p>No hay comunidades registradas</p>
          </div>
        )}
      </div>

      {/* ── Create Community Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Nueva comunidad</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div><label className="label">Nombre del fraccionamiento</label><input className="input" placeholder="Ej. Residencial Las Palmas" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label className="label">Dirección</label><input className="input" placeholder="Calle y número" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Ciudad</label><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></div>
                <div><label className="label">Estado</label><input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Teléfono (opcional)</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label className="label">Email (opcional)</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={create.isPending} className="btn-primary flex-1">
                  {create.isPending ? 'Creando...' : 'Crear y continuar →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Invite Admin Modal ── */}
      {inviteCommunityId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={closeInviteModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-900">Invitar administrador</h3>
                {newCommunityId === inviteCommunityId && (
                  <p className="text-xs text-brand-600 mt-0.5">✓ Comunidad creada — ahora asigna su administrador</p>
                )}
              </div>
              <button onClick={closeInviteModal} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            {!inviteResult ? (
              <form onSubmit={handleInvite} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Nombre</label><input className="input" placeholder="Juan" value={inviteForm.firstName} onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })} required /></div>
                  <div><label className="label">Apellido</label><input className="input" placeholder="García" value={inviteForm.lastName} onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })} required /></div>
                </div>
                <div><label className="label">Email</label><input className="input" type="email" placeholder="admin@fraccionamiento.com" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required /></div>
                <div><label className="label">Teléfono (opcional)</label><input className="input" placeholder="+52 55 1234 5678" value={inviteForm.phone} onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })} /></div>
                <div>
                  <label className="label">Rol</label>
                  <select className="input" value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}>
                    <option value="COMMUNITY_ADMIN">Administrador de comunidad</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeInviteModal} className="btn-secondary flex-1">Omitir</button>
                  <button type="submit" disabled={inviteLoading} className="btn-primary flex-1">
                    {inviteLoading ? 'Creando cuenta...' : 'Crear cuenta y asignar'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5 space-y-4">
                <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-1">
                  <p className="text-sm font-semibold text-green-800">
                    {inviteResult.isExistingUser ? '✓ Usuario asignado correctamente' : '✓ Cuenta creada y asignada'}
                  </p>
                  <p className="text-sm text-green-700">Email: <span className="font-mono">{inviteResult.email}</span></p>
                </div>

                {inviteResult.tempPassword && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 font-medium">Contraseña temporal — comparte esto con el administrador:</p>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                      <code className="flex-1 text-lg font-mono font-bold text-gray-900 tracking-wider">
                        {inviteResult.tempPassword}
                      </code>
                      <button
                        onClick={() => handleCopy(inviteResult.tempPassword!)}
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Copiar"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                      </button>
                    </div>
                    <p className="text-xs text-amber-600">⚠ Guarda esta contraseña — no se mostrará de nuevo. El administrador puede cambiarla en Ajustes.</p>
                  </div>
                )}

                {inviteResult.isExistingUser && (
                  <p className="text-sm text-gray-500">El usuario ya tenía cuenta — se le asignó acceso a esta comunidad. Puede iniciar sesión con su contraseña existente.</p>
                )}

                <button onClick={closeInviteModal} className="btn-primary w-full">Listo</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
