'use client'
import { useState, useEffect } from 'react'
import { useCommunity, useUpdateCommunity } from '@/hooks/useCommunity'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  const { data: community, isLoading } = useCommunity()
  const update = useUpdateCommunity()
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
    </div>
  )
}
