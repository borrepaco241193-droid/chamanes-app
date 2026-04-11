import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
  Image,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Svg, Rect, Text as SvgText, G } from 'react-native-svg'
import { useDashboardStats, usePaymentReport, useAccessReport, usePendingIdVerifications, useVerifyId } from '../../../src/hooks/useAdmin'
import { useAuthStore } from '../../../src/stores/auth.store'
import { router } from 'expo-router'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'

// ── Stat Card ─────────────────────────────────────────────────

interface StatCardProps {
  icon: string
  iconColor: string
  iconBg: string
  label: string
  value: string | number
  sub?: string
  subColor?: string
  badge?: { text: string; bg: string; color: string }
  half?: boolean
}

function StatCard({ icon, iconColor, iconBg, label, value, sub, subColor, badge, half }: StatCardProps) {
  return (
    <View className={`bg-surface-card border border-surface-border rounded-2xl p-4 ${half ? 'flex-1' : ''}`}>
      <View className="flex-row items-center justify-between mb-3">
        <View className={`w-9 h-9 rounded-xl items-center justify-center ${iconBg}`}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        {badge && (
          <View className={`px-2 py-0.5 rounded-full ${badge.bg}`}>
            <Text className={`text-xs font-semibold ${badge.color}`}>{badge.text}</Text>
          </View>
        )}
      </View>
      <Text className="text-white text-2xl font-bold">{value}</Text>
      <Text className="text-surface-muted text-xs mt-0.5">{label}</Text>
      {sub && (
        <Text className={`text-xs mt-1 ${subColor ?? 'text-surface-muted'}`}>{sub}</Text>
      )}
    </View>
  )
}

// ── Payment Bar Chart ─────────────────────────────────────────

function PaymentBarChart({ data }: { data: { month: string; collected: number }[] }) {
  const { width } = useWindowDimensions()
  const chartWidth = width - 80 // account for px-6 + card padding
  const barAreaHeight = 120
  const chartHeight = barAreaHeight + 28 // space for labels
  const paddingH = 4

  const maxVal = Math.max(...data.map((d) => d.collected), 1)
  const slotWidth = (chartWidth - paddingH * 2) / data.length
  const barWidth = Math.max(Math.floor(slotWidth * 0.6), 8)

  return (
    <Svg width={chartWidth} height={chartHeight}>
      {data.map((item, i) => {
        const barH = Math.max(item.collected > 0 ? (item.collected / maxVal) * barAreaHeight : 0, item.collected > 0 ? 4 : 0)
        const x = paddingH + i * slotWidth + (slotWidth - barWidth) / 2
        const y = barAreaHeight - barH

        return (
          <G key={`${item.month}-${i}`}>
            {/* Background track */}
            <Rect x={x} y={0} width={barWidth} height={barAreaHeight} rx={4} fill="#1E293B" />
            {/* Value bar */}
            {barH > 0 && (
              <Rect x={x} y={y} width={barWidth} height={barH} rx={4} fill="#3B82F6" />
            )}
            {/* Value label */}
            {item.collected > 0 && (
              <SvgText
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize="9"
                fill="#94A3B8"
              >
                {item.collected >= 1000
                  ? `$${(item.collected / 1000).toFixed(0)}k`
                  : `$${item.collected}`}
              </SvgText>
            )}
            {/* Month label */}
            <SvgText
              x={x + barWidth / 2}
              y={chartHeight - 4}
              textAnchor="middle"
              fontSize="10"
              fill="#64748B"
            >
              {item.month.split(' ')[0]}
            </SvgText>
          </G>
        )
      })}
    </Svg>
  )
}

// ── Access Bar Chart ──────────────────────────────────────────

function AccessBarChart({ data }: { data: { date: string; entries: number; exits: number; denied: number }[] }) {
  const { width } = useWindowDimensions()
  const chartWidth = width - 80
  const barAreaHeight = 100
  const chartHeight = barAreaHeight + 28
  const paddingH = 4

  const maxVal = Math.max(...data.flatMap((d) => [d.entries, d.exits, d.denied]), 1)
  const slotWidth = (chartWidth - paddingH * 2) / data.length
  const barW = Math.max(Math.floor(slotWidth / 4) - 1, 4)
  const groupW = barW * 3 + 6

  return (
    <Svg width={chartWidth} height={chartHeight}>
      {data.map((item, i) => {
        const slotX = paddingH + i * slotWidth
        const groupX = slotX + (slotWidth - groupW) / 2

        const entryH = Math.max(item.entries > 0 ? (item.entries / maxVal) * barAreaHeight : 0, item.entries > 0 ? 3 : 0)
        const exitH = Math.max(item.exits > 0 ? (item.exits / maxVal) * barAreaHeight : 0, item.exits > 0 ? 3 : 0)
        const deniedH = Math.max(item.denied > 0 ? (item.denied / maxVal) * barAreaHeight : 0, item.denied > 0 ? 3 : 0)

        return (
          <G key={`${item.date}-${i}`}>
            <Rect x={groupX} y={barAreaHeight - entryH} width={barW} height={entryH} rx={2} fill="#3B82F6" />
            <Rect x={groupX + barW + 2} y={barAreaHeight - exitH} width={barW} height={exitH} rx={2} fill="#475569" />
            <Rect x={groupX + barW * 2 + 4} y={barAreaHeight - deniedH} width={barW} height={deniedH} rx={2} fill="#EF4444" />
            <SvgText
              x={slotX + slotWidth / 2}
              y={chartHeight - 4}
              textAnchor="middle"
              fontSize="10"
              fill="#64748B"
            >
              {item.date}
            </SvgText>
          </G>
        )
      })}
    </Svg>
  )
}

// ── Main Screen ───────────────────────────────────────────────

export default function AdminScreen() {
  const user = useAuthStore((s) => s.user)
  const isAdmin =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'MANAGER' ||
    user?.role === 'COMMUNITY_ADMIN' ||
    user?.communityRole === 'SUPER_ADMIN' ||
    user?.communityRole === 'COMMUNITY_ADMIN' ||
    user?.communityRole === 'MANAGER'

  const { data: stats, isLoading, refetch: refetchStats, isRefetching } = useDashboardStats()
  const { data: paymentReport, refetch: refetchPayments } = usePaymentReport(6)
  const { data: accessReport, refetch: refetchAccess } = useAccessReport(7)
  const { data: idPendingData, refetch: refetchIdPending } = usePendingIdVerifications()
  const { mutateAsync: verifyId } = useVerifyId()
  const [previewPhoto, setPreviewPhoto] = useState<{ uri: string; name: string } | null>(null)

  const idPending = idPendingData?.pending ?? []

  function handleRefresh() {
    refetchStats()
    refetchPayments()
    refetchAccess()
    refetchIdPending()
  }

  async function handleVerifyId(userId: string, name: string, approve: boolean) {
    try {
      await verifyId({ userId, approve })
      Alert.alert(approve ? 'Aprobado' : 'Rechazado', approve
        ? `Identidad de ${name} verificada correctamente.`
        : `Foto de ${name} rechazada. El usuario deberá subir una nueva.`)
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo procesar')
    }
  }

  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6">
        <Ionicons name="lock-closed-outline" size={48} color="#334155" />
        <Text className="text-white text-lg font-bold mt-4">Acceso restringido</Text>
        <Text className="text-surface-muted text-center mt-2 text-sm">
          Esta sección es solo para administradores de la comunidad.
        </Text>
      </SafeAreaView>
    )
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const communityId = user?.communityId

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#3B82F6" />
        }
      >
        {/* Header */}
        <View className="px-6 pt-2 pb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-white text-2xl font-bold">Panel Admin</Text>
            <Text className="text-surface-muted text-xs mt-0.5">
              {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            className="w-9 h-9 bg-surface-card border border-surface-border rounded-xl items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* SUPER_ADMIN: community selector banner */}
        {isSuperAdmin && !communityId && (
          <TouchableOpacity
            onPress={() => router.push('/(app)/communities' as any)}
            style={{ marginHorizontal: 24, marginBottom: 16, backgroundColor: '#F59E0B20', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#F59E0B40' }}
            activeOpacity={0.75}
          >
            <Ionicons name="warning-outline" size={22} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 14 }}>Ninguna comunidad activa</Text>
              <Text style={{ color: '#D97706', fontSize: 12, marginTop: 2 }}>Toca aquí para seleccionar o crear una comunidad</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F59E0B" />
          </TouchableOpacity>
        )}

        {isSuperAdmin && communityId && (
          <TouchableOpacity
            onPress={() => router.push('/(app)/communities' as any)}
            style={{ marginHorizontal: 24, marginBottom: 16, backgroundColor: '#1E293B', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#334155' }}
            activeOpacity={0.75}
          >
            <Ionicons name="business-outline" size={18} color="#3B82F6" />
            <Text style={{ color: '#94A3B8', fontSize: 12, flex: 1 }}>Cambiando comunidad activa</Text>
            <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '600' }}>Cambiar</Text>
          </TouchableOpacity>
        )}

        {isLoading ? (
          <View className="items-center justify-center py-24">
            <ActivityIndicator color="#3B82F6" size="large" />
          </View>
        ) : (
          <View className="px-6 gap-3 pb-8">

            {/* Units + Residents */}
            <View className="flex-row gap-3">
              <StatCard
                half
                icon="home-outline"
                iconColor="#3B82F6"
                iconBg="bg-blue-500/20"
                label="Unidades"
                value={`${stats?.units.occupied ?? 0}/${stats?.units.total ?? 0}`}
                sub={`${stats?.units.vacant ?? 0} vacantes`}
              />
              <StatCard
                half
                icon="people-outline"
                iconColor="#10B981"
                iconBg="bg-emerald-500/20"
                label="Residentes"
                value={stats?.residents ?? 0}
                sub="activos"
              />
            </View>

            {/* Payments */}
            <StatCard
              icon="card-outline"
              iconColor="#F59E0B"
              iconBg="bg-amber-500/20"
              label="Pagos pendientes"
              value={stats?.payments.pending ?? 0}
              sub={`$${(stats?.payments.collectedThisMonth ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })} MXN recaudados este mes`}
              subColor="text-emerald-400"
              badge={
                (stats?.payments.pending ?? 0) > 0
                  ? { text: 'Requiere atención', bg: 'bg-orange-500/20', color: 'text-orange-400' }
                  : { text: 'Al día', bg: 'bg-emerald-500/20', color: 'text-emerald-400' }
              }
            />

            {/* Visitors + Staff */}
            <View className="flex-row gap-3">
              <StatCard
                half
                icon="qr-code-outline"
                iconColor="#8B5CF6"
                iconBg="bg-violet-500/20"
                label="Pases activos"
                value={stats?.visitors.activePasses ?? 0}
                sub={`${stats?.visitors.todayEvents ?? 0} eventos hoy`}
              />
              <StatCard
                half
                icon="shield-checkmark-outline"
                iconColor="#06B6D4"
                iconBg="bg-cyan-500/20"
                label="Personal"
                value={stats?.staff.onDuty ?? 0}
                sub="en turno ahora"
              />
            </View>

            {/* Work Orders */}
            <StatCard
              icon="construct-outline"
              iconColor="#F43F5E"
              iconBg="bg-rose-500/20"
              label="Órdenes de trabajo abiertas"
              value={stats?.workOrders.open ?? 0}
              badge={
                (stats?.workOrders.urgent ?? 0) > 0
                  ? {
                      text: `${stats?.workOrders.urgent} urgentes`,
                      bg: 'bg-red-500/20',
                      color: 'text-red-400',
                    }
                  : undefined
              }
            />

            {/* Reservations — tappable, goes to pending if any */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push('/(app)/reservations-admin' as any)}
            >
              <StatCard
                icon="calendar-outline"
                iconColor="#10B981"
                iconBg="bg-emerald-500/20"
                label="Reservaciones confirmadas"
                value={stats?.reservations.upcoming ?? 0}
                sub={`${stats?.reservations.pending ?? 0} por aprobar — toca para gestionar`}
                subColor={(stats?.reservations.pending ?? 0) > 0 ? 'text-amber-400' : 'text-surface-muted'}
                badge={
                  (stats?.reservations.pending ?? 0) > 0
                    ? {
                        text: `${stats?.reservations.pending} por aprobar`,
                        bg: 'bg-amber-500/20',
                        color: 'text-amber-400',
                      }
                    : undefined
                }
              />
            </TouchableOpacity>

            {/* Payment Report Chart */}
            {paymentReport && paymentReport.length > 0 && (
              <View className="bg-surface-card border border-surface-border rounded-2xl p-4">
                <Text className="text-white font-semibold mb-0.5">Recaudación mensual</Text>
                <Text className="text-surface-muted text-xs mb-4">Últimos 6 meses · MXN</Text>
                <PaymentBarChart data={paymentReport} />
                <View className="flex-row items-center gap-1.5 mt-3">
                  <View className="w-3 h-3 rounded-sm bg-primary-500" />
                  <Text className="text-surface-muted text-xs">Recaudado</Text>
                </View>
              </View>
            )}

            {/* Access Report Chart */}
            {accessReport && accessReport.length > 0 && (
              <View className="bg-surface-card border border-surface-border rounded-2xl p-4">
                <Text className="text-white font-semibold mb-0.5">Accesos — últimos 7 días</Text>
                <Text className="text-surface-muted text-xs mb-4">Entradas · Salidas · Rechazados</Text>
                <AccessBarChart data={accessReport} />
                <View className="flex-row gap-4 mt-3">
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-3 h-3 rounded-sm bg-primary-500" />
                    <Text className="text-surface-muted text-xs">Entradas</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-3 h-3 rounded-sm bg-slate-500" />
                    <Text className="text-surface-muted text-xs">Salidas</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-3 h-3 rounded-sm bg-red-500" />
                    <Text className="text-surface-muted text-xs">Rechazados</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Pending ID verifications */}
            {idPending.length > 0 && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 8 }}>
                  <Text className="text-white font-bold text-base">Verificaciones de identidad</Text>
                  <View style={{ backgroundColor: '#EF444420', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#EF444440' }}>
                    <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>{idPending.length} pendientes</Text>
                  </View>
                </View>
                {idPending.map((u) => (
                  <View key={u.id} style={{ backgroundColor: '#1E293B', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EF444430' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EF444420', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 15 }}>{u.firstName[0]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>{u.firstName} {u.lastName}</Text>
                        <Text style={{ color: '#64748B', fontSize: 12 }}>{u.email}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setPreviewPhoto({ uri: u.idPhotoUrl, name: `${u.firstName} ${u.lastName}` })}
                      style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                      <Image source={{ uri: u.idPhotoUrl }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
                      <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: '#0F172A80', borderRadius: 6, padding: 4 }}>
                        <Ionicons name="expand-outline" size={14} color="white" />
                      </View>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity onPress={() => handleVerifyId(u.id, `${u.firstName} ${u.lastName}`, false)}
                        style={{ flex: 1, backgroundColor: '#EF444420', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#EF444440' }}>
                        <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 13 }}>Rechazar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleVerifyId(u.id, `${u.firstName} ${u.lastName}`, true)}
                        style={{ flex: 1, backgroundColor: '#10B98120', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#10B98140' }}>
                        <Text style={{ color: '#10B981', fontWeight: '600', fontSize: 13 }}>Aprobar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Admin Quick Actions */}
            <Text className="text-white font-bold text-base mt-2 mb-1">Gestión</Text>

            {/* Row: Residentes + Unidades */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => router.push('/(app)/residents' as any)}
                style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155' }}
                activeOpacity={0.75}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Ionicons name="people-outline" size={18} color="#3B82F6" />
                </View>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Residentes</Text>
                <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                  {stats?.residents ?? '—'} activos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(app)/units' as any)}
                style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155' }}
                activeOpacity={0.75}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Ionicons name="home-outline" size={18} color="#10B981" />
                </View>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Unidades</Text>
                <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                  {stats?.units.occupied ?? '—'}/{stats?.units.total ?? '—'} ocupadas
                </Text>
              </TouchableOpacity>
            </View>

            {/* Row: Pagos + Accesos */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => router.push('/(app)/(tabs)/payments' as any)}
                style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: (stats?.payments.pending ?? 0) > 0 ? '#F59E0B40' : '#334155' }}
                activeOpacity={0.75}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F59E0B20', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Ionicons name="card-outline" size={18} color="#F59E0B" />
                </View>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Pagos</Text>
                <Text style={{ color: (stats?.payments.pending ?? 0) > 0 ? '#F59E0B' : '#64748B', fontSize: 11, marginTop: 2 }}>
                  {stats?.payments.pending ?? 0} pendientes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(app)/access-events' as any)}
                style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155' }}
                activeOpacity={0.75}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#06B6D420', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Ionicons name="swap-horizontal-outline" size={18} color="#06B6D4" />
                </View>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Accesos</Text>
                <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                  {stats?.visitors.todayEvents ?? 0} eventos hoy
                </Text>
              </TouchableOpacity>
            </View>

            {/* Reservaciones directas */}
            <TouchableOpacity
              onPress={() => router.push('/(app)/reservations-admin' as any)}
              style={{
                backgroundColor: '#1E293B', borderRadius: 16, padding: 16,
                flexDirection: 'row', alignItems: 'center', gap: 14,
                borderWidth: 1,
                borderColor: (stats?.reservations.pending ?? 0) > 0 ? '#F59E0B40' : '#334155',
              }}
              activeOpacity={0.75}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="calendar-outline" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Aprobar reservaciones</Text>
                <Text style={{ color: (stats?.reservations.pending ?? 0) > 0 ? '#F59E0B' : '#64748B', fontSize: 12, marginTop: 2 }}>
                  {(stats?.reservations.pending ?? 0) > 0
                    ? `${stats?.reservations.pending} por aprobar`
                    : 'Ver y gestionar todas'}
                </Text>
              </View>
              {(stats?.reservations.pending ?? 0) > 0 && (
                <View style={{ backgroundColor: '#F59E0B20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#F59E0B40' }}>
                  <Text style={{ color: '#F59E0B', fontWeight: '800', fontSize: 13 }}>{stats?.reservations.pending}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color="#475569" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(app)/reports' as any)}
              className="bg-surface-card border border-surface-border rounded-2xl p-4 flex-row items-center gap-4"
              activeOpacity={0.75}
            >
              <View className="w-10 h-10 rounded-xl bg-cyan-500/20 items-center justify-center">
                <Ionicons name="download-outline" size={20} color="#06B6D4" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-base">Reportes CSV</Text>
                <Text className="text-surface-muted text-xs mt-0.5">
                  Exportar accesos, pagos, reservaciones, visitantes
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#475569" />
            </TouchableOpacity>

            {isSuperAdmin && (
              <TouchableOpacity
                onPress={() => router.push('/(app)/communities' as any)}
                className="bg-surface-card border border-surface-border rounded-2xl p-4 flex-row items-center gap-4"
                activeOpacity={0.75}
              >
                <View className="w-10 h-10 rounded-xl bg-violet-500/20 items-center justify-center">
                  <Ionicons name="business-outline" size={20} color="#8B5CF6" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base">Gestionar comunidades</Text>
                  <Text className="text-surface-muted text-xs mt-0.5">
                    Crear clusters, asignar admins y managers
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#475569" />
              </TouchableOpacity>
            )}

          </View>
        )}
      </ScrollView>

      {/* Full-screen photo preview modal */}
      <Modal visible={!!previewPhoto} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
        <View style={{ flex: 1, backgroundColor: '#000000EE', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <TouchableOpacity onPress={() => setPreviewPhoto(null)} style={{ position: 'absolute', top: 56, right: 20, zIndex: 10 }}>
            <Ionicons name="close-circle" size={36} color="white" />
          </TouchableOpacity>
          {previewPhoto && (
            <>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 16, marginBottom: 16 }}>{previewPhoto.name}</Text>
              <Image source={{ uri: previewPhoto.uri }} style={{ width: '100%', height: 400, borderRadius: 14 }} resizeMode="contain" />
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  )
}
