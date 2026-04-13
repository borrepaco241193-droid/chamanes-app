'use client'
import { useDashboardStats, usePaymentReport, useAccessReport } from '@/hooks/useCommunity'
import { useAuthStore } from '@/store/auth.store'
import { formatMoney } from '@/lib/utils'
import {
  Users, CreditCard, Calendar, AlertTriangle,
  TrendingUp, DoorOpen, ClipboardList, Shield,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'

function StatCard({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string; value: string | number; sub?: string; icon: any; color: string; trend?: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          {trend && <p className="text-xs text-green-600 font-medium mt-1">↑ {trend}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, activeCommunityId } = useAuthStore()
  const { data: stats, isLoading } = useDashboardStats()
  const { data: paymentReport } = usePaymentReport()
  const { data: accessReport } = useAccessReport()

  if (!activeCommunityId && user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No tienes una comunidad asignada.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-7 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const s = stats ?? {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen general de tu comunidad</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Residentes activos" value={s.totalResidents ?? 0} icon={Users} color="bg-blue-500" sub="usuarios registrados" />
        <StatCard label="Unidades ocupadas" value={`${s.occupiedUnits ?? 0}/${s.totalUnits ?? 0}`} icon={Shield} color="bg-indigo-500" />
        <StatCard label="Pagos pendientes" value={s.pendingPayments ?? 0} icon={AlertTriangle} color="bg-yellow-500" sub={formatMoney(s.pendingAmount)} />
        <StatCard label="Ingresos del mes" value={formatMoney(s.monthlyRevenue)} icon={CreditCard} color="bg-green-500" trend={`${s.revenueGrowth ?? 0}%`} />
        <StatCard label="Reservaciones hoy" value={s.todayReservations ?? 0} icon={Calendar} color="bg-purple-500" />
        <StatCard label="Visitas activas" value={s.activeVisitorPasses ?? 0} icon={DoorOpen} color="bg-cyan-500" />
        <StatCard label="Órdenes abiertas" value={s.openWorkOrders ?? 0} icon={ClipboardList} color="bg-orange-500" />
        <StatCard label="Accesos hoy" value={s.todayAccessEvents ?? 0} icon={TrendingUp} color="bg-pink-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment chart */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Ingresos por mes</h3>
          {paymentReport?.data?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={paymentReport.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString('es-MX')}`, 'Cobrado']} />
                <Bar dataKey="collected" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Cobrado" />
                <Bar dataKey="pending" fill="#fbbf24" radius={[4, 4, 0, 0]} name="Pendiente" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
          )}
        </div>

        {/* Access chart */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Accesos diarios (últimos 7 días)</h3>
          {accessReport?.data?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={accessReport.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="entries" stroke="#10b981" strokeWidth={2} dot={false} name="Entradas" />
                <Line type="monotone" dataKey="exits" stroke="#6366f1" strokeWidth={2} dot={false} name="Salidas" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
          )}
        </div>
      </div>

      {/* Alerts section */}
      {(s.pendingPayments > 0 || s.openWorkOrders > 0) && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Acciones requeridas</h3>
          <div className="space-y-2">
            {s.pendingPayments > 0 && (
              <a href="/dashboard/payments?status=PENDING" className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <span className="text-sm text-yellow-800">
                  <span className="font-semibold">{s.pendingPayments} pagos</span> pendientes por {formatMoney(s.pendingAmount)}
                </span>
              </a>
            )}
            {s.openWorkOrders > 0 && (
              <a href="/dashboard/workorders?status=OPEN" className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                <ClipboardList className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <span className="text-sm text-orange-800">
                  <span className="font-semibold">{s.openWorkOrders} órdenes de trabajo</span> sin asignar
                </span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
