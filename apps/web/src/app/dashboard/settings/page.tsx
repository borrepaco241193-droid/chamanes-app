'use client'
import { useState, useEffect, useRef } from 'react'
import { useCommunity, useUpdateCommunity } from '@/hooks/useCommunity'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { Settings, Camera } from 'lucide-react'

export default function SettingsPage() {
  const { data: community, isLoading } = useCommunity()
  const update = useUpdateCommunity()
  const { user, setUser } = useAuthStore()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setAvatarError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/auth/upload-avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUser({ avatarUrl: data.avatarUrl })
    } catch (err: any) {
      setAvatarError(err?.response?.data?.message ?? 'No se pudo subir la foto')
    } finally {
      setAvatarUploading(false)
    }
  }

  const updateProfile = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      await api.patch('/auth/me', data)
      return data
    },
    onSuccess: (data) => {
      setUser(data)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    },
  })

  const [profileForm, setProfileForm] = useState({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' })
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError('')
    try {
      await updateProfile.mutateAsync(profileForm)
    } catch (err: any) {
      setProfileError(err?.response?.data?.message ?? 'No se pudo actualizar el nombre')
    }
  }

  const changeEmail = useMutation({
    mutationFn: async ({ newEmail, currentPassword }: { newEmail: string; currentPassword: string }) => {
      await api.post('/auth/change-email', { newEmail, currentPassword })
      return newEmail
    },
    onSuccess: (newEmail) => {
      setUser({ email: newEmail })
      setEmailForm({ newEmail: '', currentPassword: '' })
      setEmailSaved(true)
      setTimeout(() => setEmailSaved(false), 3000)
    },
  })

  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPassword: '' })
  const [showEmailPw, setShowEmailPw] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)
  const [emailError, setEmailError] = useState('')

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')
    try {
      await changeEmail.mutateAsync(emailForm)
    } catch (err: any) {
      setEmailError(err?.response?.data?.message ?? 'No se pudo cambiar el correo')
    }
  }

  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', country: 'MX',
    zipCode: '', phone: '', email: '', timezone: 'America/Mexico_City', currency: 'MXN',
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (community) {
      setForm({
        name: community.name ?? '',
        address: community.address ?? '',
        city: community.city ?? '',
        state: community.state ?? '',
        country: community.country ?? 'MX',
        zipCode: community.zipCode ?? '',
        phone: community.phone ?? '',
        email: community.email ?? '',
        timezone: community.timezone ?? 'America/Mexico_City',
        currency: community.currency ?? 'MXN',
      })
    }
  }, [community])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await update.mutateAsync(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (isLoading) return <div className="card p-8 animate-pulse h-48" />

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm">Información general de la comunidad</p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Nombre de la comunidad</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Dirección</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Ciudad</label><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><label className="label">Estado</label><input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">País</label><input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            <div><label className="label">Código postal</label><input className="input" value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} /></div>
            <div><label className="label">Moneda</label>
              <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="MXN">MXN — Peso mexicano</option>
                <option value="USD">USD — Dólar</option>
                <option value="COP">COP — Peso colombiano</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Teléfono de contacto</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label">Email de contacto</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div>
            <label className="label">Zona horaria</label>
            <select className="input" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
              <option value="America/Mexico_City">America/Mexico_City (CDMX)</option>
              <option value="America/Monterrey">America/Monterrey</option>
              <option value="America/Tijuana">America/Tijuana</option>
              <option value="America/Bogota">America/Bogota</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={update.isPending} className="btn-primary">
              {update.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
            {saved && <span className="text-sm text-green-600 font-medium">✓ Guardado correctamente</span>}
          </div>
        </form>
      </div>
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Mi perfil</h2>

        {/* Avatar upload */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center text-xl font-bold text-white overflow-hidden">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                : <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
              }
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-600 hover:bg-brand-700 rounded-full flex items-center justify-center shadow-md transition-colors"
            >
              <Camera className="w-3 h-3 text-white" />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
            {avatarUploading && <p className="text-xs text-brand-600 mt-1">Subiendo foto...</p>}
            {avatarError && <p className="text-xs text-red-600 mt-1">{avatarError}</p>}
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4 mb-6 pb-6 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={profileForm.firstName} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Apellido</label>
              <input className="input" value={profileForm.lastName} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} required />
            </div>
          </div>
          {profileError && <p className="text-sm text-red-600">{profileError}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={updateProfile.isPending} className="btn-primary">
              {updateProfile.isPending ? 'Guardando...' : 'Actualizar nombre'}
            </button>
            {profileSaved && <span className="text-sm text-green-600 font-medium">✓ Nombre actualizado</span>}
          </div>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Mi cuenta</h2>
        <div className="mb-3">
          <p className="text-sm text-gray-500">Correo actual</p>
          <p className="font-medium text-gray-900">{user?.email ?? '—'}</p>
        </div>
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="label">Nuevo correo electrónico</label>
            <input className="input" type="email" value={emailForm.newEmail} onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })} required />
          </div>
          <div>
            <label className="label">Contraseña actual</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showEmailPw ? 'text' : 'password'}
                value={emailForm.currentPassword}
                onChange={(e) => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
                required
              />
              <button type="button" onClick={() => setShowEmailPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showEmailPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {emailError && <p className="text-sm text-red-600">{emailError}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={changeEmail.isPending} className="btn-primary">
              {changeEmail.isPending ? 'Guardando...' : 'Actualizar correo'}
            </button>
            {emailSaved && <span className="text-sm text-green-600 font-medium">✓ Correo actualizado</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
