'use client'
import { useState } from 'react'
import { useAllCommunities, useCreateCommunity } from '@/hooks/useCommunity'
import { useAuthStore } from '@/store/auth.store'
import { Building2, Plus, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export default function CommunitiesPage() {
  const { user, setActiveCommunity } = useAuthStore()
  const router = useRouter()
  const { data: communities, isLoading } = useAllCommunities()
  const create = useCreateCommunity()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', city: '', state: '', country: 'MX', phone: '', email: '' })

  if (user?.role !== 'SUPER_ADMIN') {
    return <div className="card p-8 text-center text-gray-400">Solo disponible para Super Admins.</div>
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await create.mutateAsync(form)
    setShowCreate(false)
    setForm({ name: '', address: '', city: '', state: '', country: 'MX', phone: '', email: '' })
  }

  const handleSelect = (id: string) => {
    setActiveCommunity(id)
    router.push('/dashboard')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comunidades</h1>
          <p className="text-gray-500 text-sm">{communities?.length ?? 0} comunidad{(communities?.length ?? 0) !== 1 ? 'es' : ''} registrada{(communities?.length ?? 0) !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> Nueva comunidad</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && [...Array(3)].map((_, i) => <div key={i} className="card p-6 h-36 animate-pulse bg-gray-100" />)}
        {communities?.map((c: any) => (
          <button
            key={c.id}
            onClick={() => handleSelect(c.id)}
            className="card p-6 text-left hover:shadow-md hover:border-brand-300 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{c.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{c.city}, {c.state}</p>
                <p className="text-sm text-gray-400 mt-1">{c.totalUnits} unidades</p>
                <p className="text-xs text-gray-400 mt-1">Creada: {formatDate(c.createdAt)}</p>
              </div>
            </div>
          </button>
        ))}
        {!isLoading && (communities?.length ?? 0) === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-400">
            <Building2 className="w-10 h-10 text-gray-200 mb-3" />
            <p>No hay comunidades registradas</p>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Nueva comunidad</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div><label className="label">Nombre</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label className="label">Dirección</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Ciudad</label><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></div>
                <div><label className="label">Estado</label><input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Teléfono</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={create.isPending} className="btn-primary flex-1">{create.isPending ? 'Creando...' : 'Crear comunidad'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
