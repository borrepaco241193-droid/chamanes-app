'use client'
import { useUnits } from '@/hooks/useResidents'
import { Home, Users } from 'lucide-react'

export default function UnitsPage() {
  const { data, isLoading } = useUnits()
  const units = data?.units ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Unidades</h1>
        <p className="text-gray-500 text-sm">{units.length} unidad{units.length !== 1 ? 'es' : ''} registrada{units.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading && [...Array(8)].map((_, i) => <div key={i} className="card p-4 h-28 animate-pulse bg-gray-100" />)}
        {!isLoading && units.length === 0 && (
          <div className="col-span-4 flex flex-col items-center justify-center py-16 text-gray-400">
            <Home className="w-10 h-10 text-gray-200 mb-3" />
            <p>No hay unidades registradas</p>
          </div>
        )}
        {units.map((u: any) => (
          <div key={u.id} className="card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-900">#{u.number}</h3>
              <span className={`badge ${u.isOccupied ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                {u.isOccupied ? 'Ocupada' : 'Disponible'}
              </span>
            </div>
            {u.block && <p className="text-sm text-gray-500">Bloque: {u.block}</p>}
            {u.floor != null && <p className="text-sm text-gray-500">Piso: {u.floor}</p>}
            <p className="text-sm text-gray-500 capitalize">{u.type}</p>
            {u.residents?.length > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                <Users className="w-3 h-3" />
                {u.residents.length} residente{u.residents.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
