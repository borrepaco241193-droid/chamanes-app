'use client'
import { useState } from 'react'
import { useResidents, useCreateResident, useDeleteResident, useUnits, useUpdateResident, useChangeRole, useAdminResetPassword } from '@/hooks/useResidents'
import { useAuthStore } from '@/store/auth.store'
import { fullName, formatDate, ROLE_LABEL, ID_STATUS_COLOR, ID_STATUS_LABEL } from '@/lib/utils'
import { Plus, Search, UserX, X, Users, Mail, Shield, KeyRound } from 'lucide-react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const ROLE_OPTIONS = [
  { value: 'RESIDENT', label: 'Residente' },
  { value: 'COMMUNITY_ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'GUARD', label: 'Guardia' },
  { value: 'STAFF', label: 'Técnico' },
]

const ROLE_BADGE: Record<string, any> = {
  SUPER_ADMIN: 'destructive',
  COMMUNITY_ADMIN: 'info',
  MANAGER: 'info',
  GUARD: 'warning',
  RESIDENT: 'secondary',
  STAFF: 'secondary',
}

const ID_BADGE: Record<string, any> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'destructive',
  NOT_SUBMITTED: 'secondary',
}

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
  const resetPassword = useAdminResetPassword()
  const { user, activeCommunityId, activeCommunityIds } = useAuthStore()
  const communities = user?.communities ?? []
  const hasMultiple = communities.length > 1
  const defaultCommunityId = activeCommunityId ?? activeCommunityIds[0] ?? communities[0]?.id ?? ''
  const residents = data?.residents ?? []

  const [resetPasswordResult, setResetPasswordResult] = useState<{ name: string; password: string } | null>(null)
  const handleResetPassword = async (r: any) => {
    if (!confirm(`¿Generar nueva contraseña temporal para ${fullName(r.user)}?`)) return
    const result = await resetPassword.mutateAsync({ userId: r.id, communityId: r._communityId })
    if (result?.tempPassword) setResetPasswordResult({ name: fullName(r.user), password: result.tempPassword })
  }

  const [editEmailResident, setEditEmailResident] = useState<{ id: string; name: string; email: string } | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [changeRoleResident, setChangeRoleResident] = useState<{ id: string; name: string; role: string; communityId?: string } | null>(null)
  const [newRole, setNewRole] = useState('')
  const [roleError, setRoleError] = useState('')

  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!changeRoleResident) return
    setRoleError('')
    try {
      await changeRole.mutateAsync({ userId: changeRoleResident.id, role: newRole, communityId: changeRoleResident.communityId })
      setChangeRoleResident(null)
      setNewRole('')
    } catch (err: any) {
      setRoleError(err?.response?.data?.message ?? 'Error al cambiar el rol')
    }
  }
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editEmailResident) return
    await updateResident.mutateAsync({ userId: editEmailResident.id, body: { email: newEmail } })
    setEditEmailResident(null)
    setNewEmail('')
  }

  const communityUnits = (unitsData?.units ?? []).filter((u: any) =>
    !hasMultiple || !u._communityId || u._communityId === form.communityId
  )

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', role: 'RESIDENT',
    unitId: '', occupancyType: 'OWNER', isPrimary: true, communityId: defaultCommunityId,
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const { communityId, ...rest } = form
    const result = await createResident.mutateAsync({ ...rest, communityId, unitId: form.unitId || undefined })
    const pwd = result?.data?.tempPassword ?? result?.tempPassword
    if (pwd) setCreatedPassword(pwd)
    else setShowCreate(false)
    setForm({ firstName: '', lastName: '', email: '', phone: '', role: 'RESIDENT', unitId: '', occupancyType: 'OWNER', isPrimary: true, communityId: defaultCommunityId })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Residentes</h1>
          <p className="text-muted-foreground text-sm">{residents.length} registrado{residents.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Agregar residente
        </Button>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nombre o email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Residente</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Cargando...</TableCell></TableRow>
            )}
            {!isLoading && residents.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-12">
                <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground">No hay residentes registrados</p>
              </TableCell></TableRow>
            )}
            {residents.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {r.user?.avatarUrl
                      ? <Image src={r.user.avatarUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                      : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {r.user?.firstName?.[0]}{r.user?.lastName?.[0]}
                      </div>
                    }
                    <span className="font-medium">{fullName(r.user)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.user?.email ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{r.phone ?? r.user?.phone ?? '—'}</TableCell>
                <TableCell>
                  {r.units?.length > 0
                    ? r.units.map((u: any) => (
                      <Badge key={u.id} variant="secondary" className="mr-1">
                        {u.number} {u.isPrimary && '★'}
                      </Badge>
                    ))
                    : <span className="text-muted-foreground">—</span>
                  }
                </TableCell>
                <TableCell>
                  <Badge variant={ROLE_BADGE[r.role] ?? 'secondary'}>{ROLE_LABEL[r.role] ?? r.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={ID_BADGE[r.user?.idVerificationStatus ?? 'NOT_SUBMITTED'] ?? 'secondary'}>
                    {ID_STATUS_LABEL[r.user?.idVerificationStatus ?? 'NOT_SUBMITTED']}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(r.joinedAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setChangeRoleResident({ id: r.id, name: fullName(r.user), role: r.role ?? 'RESIDENT', communityId: r._communityId }); setNewRole(r.role ?? 'RESIDENT') }}
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
                      onClick={() => handleResetPassword(r)}
                      className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Nueva contraseña temporal"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`¿Desactivar a ${fullName(r.user)}?`)) deleteResident.mutate(r.id) }}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Desactivar residente"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar residente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {hasMultiple && (
              <div>
                <label className="label">Residencial</label>
                <select className="input" value={form.communityId} onChange={(e) => setForm({ ...form, communityId: e.target.value, unitId: '' })} required>
                  <option value="">Selecciona un residencial...</option>
                  {communities.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Nombre</label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
              <div><label className="label">Apellido</label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
            </div>
            <div><label className="label">Correo electrónico</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div><label className="label">Teléfono</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
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
                  {communityUnits.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.number}{u.block ? ` · Bloque ${u.block}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" disabled={createResident.isPending} className="flex-1">
                {createResident.isPending ? 'Guardando...' : 'Agregar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit email modal */}
      <Dialog open={!!editEmailResident} onOpenChange={(open) => { if (!open) { setEditEmailResident(null); setNewEmail('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar correo — {editEmailResident?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label className="label">Correo actual</label>
              <p className="text-sm text-muted-foreground mt-1">{editEmailResident?.email || '—'}</p>
            </div>
            <div>
              <label className="label">Nuevo correo electrónico</label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditEmailResident(null); setNewEmail('') }}>Cancelar</Button>
              <Button type="submit" disabled={updateResident.isPending} className="flex-1">
                {updateResident.isPending ? 'Guardando...' : 'Actualizar correo'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change role modal */}
      <Dialog open={!!changeRoleResident} onOpenChange={(open) => { if (!open) { setChangeRoleResident(null); setNewRole('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar rol — {changeRoleResident?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangeRole} className="space-y-4">
            <div>
              <label className="label">Rol actual</label>
              <p className="text-sm text-muted-foreground mt-1">{ROLE_LABEL[changeRoleResident?.role ?? ''] ?? changeRoleResident?.role}</p>
            </div>
            <div>
              <label className="label">Nuevo rol</label>
              <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {roleError && <p className="text-sm text-destructive">{roleError}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setChangeRoleResident(null); setNewRole(''); setRoleError('') }}>Cancelar</Button>
              <Button type="submit" disabled={changeRole.isPending || newRole === changeRoleResident?.role} className="flex-1">
                {changeRole.isPending ? 'Guardando...' : 'Cambiar rol'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password result modal */}
      <Dialog open={!!resetPasswordResult} onOpenChange={(open) => { if (!open) setResetPasswordResult(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contraseña temporal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Nueva contraseña temporal para <strong>{resetPasswordResult?.name}</strong>:</p>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
              <p className="text-xs text-amber-600 mb-1">Contraseña temporal</p>
              <code className="text-xl font-bold text-amber-900 dark:text-amber-300 tracking-widest">{resetPasswordResult?.password}</code>
            </div>
            <p className="text-xs text-muted-foreground">Comparte esta contraseña con el usuario. Deberá cambiarla al iniciar sesión.</p>
            <Button className="w-full" onClick={() => setResetPasswordResult(null)}>Entendido</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Temp password modal after create */}
      <Dialog open={!!createdPassword} onOpenChange={(open) => { if (!open) { setCreatedPassword(null); setShowCreate(false) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Residente creado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">El residente fue creado exitosamente. Comparte esta contraseña temporal:</p>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl text-center">
              <p className="text-xs text-blue-600 mb-1">Contraseña temporal</p>
              <code className="text-xl font-bold text-blue-900 dark:text-blue-300 tracking-widest">{createdPassword}</code>
            </div>
            <p className="text-xs text-muted-foreground">El residente deberá cambiarla en su primer inicio de sesión.</p>
            <Button className="w-full" onClick={() => { setCreatedPassword(null); setShowCreate(false) }}>Entendido</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
