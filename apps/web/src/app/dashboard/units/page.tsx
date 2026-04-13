'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useUnits, useResidents } from '@/hooks/useResidents'
import { useWorkOrders } from '@/hooks/useStaff'
import {
  Home, Users, ChevronDown, ChevronUp,
  CreditCard, ClipboardList,
  AlertCircle, CheckCircle2, Wrench,
} from 'lucide-react'

function UnitCard({
  unit,
  residentMap,
  workOrdersByUser,
}: {
  unit: any
  residentMap: Map<string, any>
  workOrdersByUser: Map<string, any[]>
}) {
  const [expanded, setExpanded] = useState(false)

  const residents: any[] = (unit.residents ?? []).map((r: any) => {
    const cu = r.communityUser
    const userId = cu?.userId ?? cu?.user?.id
    const fromList = userId ? residentMap.get(userId) : null
    const wos = userId ? (workOrdersByUser.get(userId) ?? []) : []
    return {
      id: userId,
      firstName: cu?.user?.firstName ?? '',
      lastName: cu?.user?.lastName ?? '',
      email: cu?.user?.email ?? '',
      role: cu?.role ?? '',
      pendingPayments: fromList?.pendingPayments ?? 0,
      pendingAmount: fromList?.pendingAmount ?? 0,
      openWorkOrders: wos.filter((w) => w.status !== 'COMPLETED' && w.status !== 'CANCELLED'),
    }
  })

  const hasPending = residents.some((r) => r.pendingPayments > 0)
  const hasOpenWOs = residents.some((r) => r.openWorkOrders.length > 0)

  return (
    <div className="card overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">#{unit.number}</h3>
            {unit.block && <span className="text-xs text-gray-400">Bloque {unit.block}</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge ${unit.isOccupied ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
              {unit.isOccupied ? 'Ocupada' : 'Disponible'}
            </span>
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          {unit.floor != null && <span>Piso {unit.floor}</span>}
          <span className="capitalize">{unit.type}</span>
          {unit.sqMeters && <span>{unit.sqMeters} m²</span>}
        </div>

        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Users className="w-3 h-3" />
            {residents.length} residente{residents.length !== 1 ? 's' : ''}
          </div>
          {hasPending && (
            <Link href="/dashboard/payments" className="flex items-center gap-1 text-xs text-amber-600 font-medium hover:underline">
              <AlertCircle className="w-3 h-3" />
              Pagos pendientes
            </Link>
          )}
          {hasOpenWOs && (
            <Link href="/dashboard/workorders" className="flex items-center gap-1 text-xs text-orange-600 font-medium hover:underline">
              <Wrench className="w-3 h-3" />
              Órdenes abiertas
            </Link>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
          {residents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">Sin residentes registrados</p>
          ) : (
            residents.map((r) => (
              <div key={r.id} className="bg-white rounded-lg p-3 border border-gray-100 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.firstName} {r.lastName}</p>
                    <p className="text-xs text-gray-500">{r.email}</p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{r.role?.toLowerCase().replace('_', ' ')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {r.pendingPayments > 0 ? (
                      <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                        <CreditCard className="w-3 h-3" />
                        {r.pendingPayments} pago{r.pendingPayments !== 1 ? 's' : ''} pendiente{r.pendingPayments !== 1 ? 's' : ''}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                        Al corriente
                      </div>
                    )}
                  </div>
                </div>
                {r.openWorkOrders.length > 0 && (
                  <div className="border-t border-gray-50 pt-2 space-y-1">
                    {r.openWorkOrders.map((wo: any) => (
                      <Link key={wo.id} href="/dashboard/workorders" className="flex items-center gap-2 text-xs hover:bg-orange-50 rounded px-1 -mx-1 transition-colors">
                        <ClipboardList className="w-3 h-3 text-orange-500 flex-shrink-0" />
                        <span className="text-gray-700 truncate">{wo.title}</span>
                        <span className={`ml-auto flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium
                          ${wo.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                            wo.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-600'}`}>
                          {wo.priority}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          {unit.ownerName && (
            <div className="text-xs text-gray-500 pt-1 border-t border-gray-100">
              <span className="font-medium text-gray-700">Propietario:</span> {unit.ownerName}
              {unit.ownerPhone && <> · {unit.ownerPhone}</>}
            </div>
          )}

          {unit.vehicles?.length > 0 && (
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">Vehículos:</span>{' '}
              {unit.vehicles.map((v: any) => v.plateNumber ?? `${v.make} ${v.model}`).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function UnitsPage() {
  const { data, isLoading } = useUnits(true)
  const { data: residentsData } = useResidents()
  const { data: workOrdersData } = useWorkOrders()
  const units = data?.units ?? []
  const stats = data?.stats

  // Map userId → resident (with pendingPayments)
  const residentMap = new Map<string, any>()
  const residentsList: any[] = residentsData?.residents ?? []
  residentsList.forEach((r) => residentMap.set(r.id, r))

  // Map userId → work orders (non-completed, non-cancelled)
  const workOrdersByUser = new Map<string, any[]>()
  const woList: any[] = Array.isArray(workOrdersData) ? workOrdersData : []
  woList
    .filter((wo) => wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED')
    .forEach((wo) => {
      const uid = wo.reportedById
      if (!uid) return
      if (!workOrdersByUser.has(uid)) workOrdersByUser.set(uid, [])
      workOrdersByUser.get(uid)!.push(wo)
    })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Unidades</h1>
        <p className="text-gray-500 text-sm">{units.length} unidad{units.length !== 1 ? 'es' : ''} registrada{units.length !== 1 ? 's' : ''}</p>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Total</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.occupied}</p>
            <p className="text-xs text-gray-500 mt-1">Ocupadas</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-400">{stats.vacant}</p>
            <p className="text-xs text-gray-500 mt-1">Disponibles</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && [...Array(8)].map((_, i) => <div key={i} className="card p-4 h-28 animate-pulse bg-gray-100" />)}
        {!isLoading && units.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-400">
            <Home className="w-10 h-10 text-gray-200 mb-3" />
            <p>No hay unidades registradas</p>
          </div>
        )}
        {units.map((u: any) => (
          <UnitCard key={u.id} unit={u} residentMap={residentMap} workOrdersByUser={workOrdersByUser} />
        ))}
      </div>
    </div>
  )
}
