'use client'
import Link from 'next/link'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function StatCard({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string; value: string | number; sub?: string; icon: any; color: string; trend?: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            {trend && <p className="text-xs text-emerald-600 font-medium mt-1">↑ {trend}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
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
          <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No tienes una comunidad asignada.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-3" />
                <div className="h-7 bg-muted rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const totalResidents    = stats?.residents ?? 0
  const occupiedUnits     = stats?.units?.occupied ?? 0
  const totalUnits        = stats?.units?.total ?? 0
  const pendingPayments   = stats?.payments?.pending ?? 0
  const monthlyRevenue    = stats?.payments?.collectedThisMonth ?? 0
  const todayReservations = stats?.reservations?.pending ?? 0
  const activeVisitorPasses = stats?.visitors?.activePasses ?? 0
  const openWorkOrders    = stats?.workOrders?.open ?? 0
  const todayAccessEvents = stats?.visitors?.todayEvents ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Resumen general de tu comunidad</p>
        </div>
        {pendingPayments > 0 && (
          <Badge variant="warning">{pendingPayments} pagos pendientes</Badge>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Residentes activos" value={totalResidents} icon={Users} color="bg-blue-500" sub="usuarios registrados" />
        <StatCard label="Unidades ocupadas" value={`${occupiedUnits}/${totalUnits}`} icon={Shield} color="bg-indigo-500" />
        <StatCard label="Pagos pendientes" value={pendingPayments} icon={AlertTriangle} color="bg-yellow-500" />
        <StatCard label="Ingresos del mes" value={formatMoney(monthlyRevenue)} icon={CreditCard} color="bg-green-500" />
        <StatCard label="Reserv. pendientes" value={todayReservations} icon={Calendar} color="bg-purple-500" />
        <StatCard label="Visitas activas" value={activeVisitorPasses} icon={DoorOpen} color="bg-cyan-500" />
        <StatCard label="Órdenes abiertas" value={openWorkOrders} icon={ClipboardList} color="bg-orange-500" />
        <StatCard label="Accesos hoy" value={todayAccessEvents} icon={TrendingUp} color="bg-pink-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ingresos por mes</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentReport?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={paymentReport}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString('es-MX')}`, 'Cobrado']} />
                  <Bar dataKey="collected" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Cobrado" />
                  <Bar dataKey="pending" fill="#fbbf24" radius={[4, 4, 0, 0]} name="Pendiente" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Accesos diarios (últimos 7 días)</CardTitle>
          </CardHeader>
          <CardContent>
            {accessReport?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={accessReport}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="entries" stroke="#10b981" strokeWidth={2} dot={false} name="Entradas" />
                  <Line type="monotone" dataKey="exits" stroke="#6366f1" strokeWidth={2} dot={false} name="Salidas" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts section */}
      {(pendingPayments > 0 || openWorkOrders > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Acciones requeridas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingPayments > 0 && (
              <Link href="/dashboard/payments" className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-950/40 transition-colors">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <span className="text-sm text-yellow-800 dark:text-yellow-400">
                  <span className="font-semibold">{pendingPayments} pagos</span> pendientes de cobranza
                </span>
              </Link>
            )}
            {openWorkOrders > 0 && (
              <Link href="/dashboard/workorders" className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-colors">
                <ClipboardList className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <span className="text-sm text-orange-800 dark:text-orange-400">
                  <span className="font-semibold">{openWorkOrders} órdenes de trabajo</span> abiertas
                </span>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
