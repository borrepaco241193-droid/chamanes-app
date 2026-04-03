import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { router } from 'expo-router'
import { useWorkOrders } from '../../../src/hooks/useWorkOrders'
import { useAuthStore } from '../../../src/stores/auth.store'
import { format } from 'date-fns'
import type { WorkOrder, WorkOrderStatus } from '../../../src/services/workorder.service'

// ── Config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<WorkOrderStatus, { label: string; bg: string; text: string }> = {
  OPEN:        { label: 'Abierta',      bg: 'bg-blue-500/20',    text: 'text-blue-400' },
  ASSIGNED:    { label: 'Asignada',     bg: 'bg-violet-500/20',  text: 'text-violet-400' },
  IN_PROGRESS: { label: 'En progreso',  bg: 'bg-amber-500/20',   text: 'text-amber-400' },
  COMPLETED:   { label: 'Completada',   bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  CANCELLED:   { label: 'Cancelada',    bg: 'bg-slate-500/20',   text: 'text-slate-400' },
}

const PRIORITY_CONFIG = {
  URGENT: { label: 'URGENTE', bg: 'bg-red-500/20',    text: 'text-red-400',    dot: '#EF4444' },
  HIGH:   { label: 'ALTO',    bg: 'bg-orange-500/20', text: 'text-orange-400', dot: '#F97316' },
  MEDIUM: { label: 'MEDIO',   bg: 'bg-amber-500/20',  text: 'text-amber-400',  dot: '#F59E0B' },
  LOW:    { label: 'BAJO',    bg: 'bg-slate-500/20',  text: 'text-slate-400',  dot: '#64748B' },
}

const CATEGORY_ICONS: Record<string, string> = {
  maintenance: 'construct-outline',
  cleaning:    'sparkles-outline',
  security:    'shield-outline',
  other:       'ellipsis-horizontal-outline',
}

const FILTERS: { label: string; value?: WorkOrderStatus }[] = [
  { label: 'Todas' },
  { label: 'Abiertas',   value: 'OPEN' },
  { label: 'En curso',   value: 'IN_PROGRESS' },
  { label: 'Completadas', value: 'COMPLETED' },
]

// ── Work Order Card ───────────────────────────────────────────

function WorkOrderCard({ order }: { order: WorkOrder }) {
  const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.OPEN
  const priority = PRIORITY_CONFIG[order.priority] ?? PRIORITY_CONFIG.MEDIUM
  const categoryIcon = CATEGORY_ICONS[order.category] ?? 'construct-outline'

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/workorder/${order.id}` as any)}
      className="bg-surface-card border border-surface-border rounded-2xl p-4 mb-3"
      activeOpacity={0.75}
    >
      {/* Top row: priority dot + title + status */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1 mr-2">
          <View className="w-2 h-2 rounded-full mt-1" style={{ backgroundColor: priority.dot }} />
          <Text className="text-white font-semibold text-base flex-1" numberOfLines={2}>
            {order.title}
          </Text>
        </View>
        <View className={`px-2 py-0.5 rounded-full ${status.bg}`}>
          <Text className={`text-xs font-medium ${status.text}`}>{status.label}</Text>
        </View>
      </View>

      {/* Description preview */}
      <Text className="text-surface-muted text-sm mb-3" numberOfLines={2}>
        {order.description}
      </Text>

      {/* Bottom row: category, location, comments, due date */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Ionicons name={categoryIcon as any} size={13} color="#64748B" />
            <Text className="text-surface-muted text-xs capitalize">{order.category}</Text>
          </View>
          {order.location && (
            <View className="flex-row items-center gap-1">
              <Ionicons name="location-outline" size={13} color="#64748B" />
              <Text className="text-surface-muted text-xs" numberOfLines={1}>{order.location}</Text>
            </View>
          )}
          {(order._count?.comments ?? 0) > 0 && (
            <View className="flex-row items-center gap-1">
              <Ionicons name="chatbubble-outline" size={13} color="#64748B" />
              <Text className="text-surface-muted text-xs">{order._count!.comments}</Text>
            </View>
          )}
        </View>

        {order.dueDate && order.status !== 'COMPLETED' && (
          <Text className="text-surface-muted text-xs">
            {format(new Date(order.dueDate), 'd MMM')}
          </Text>
        )}
        {order.completedAt && (
          <Text className="text-emerald-400 text-xs">
            ✓ {format(new Date(order.completedAt), 'd MMM')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ── Screen ────────────────────────────────────────────────────

export default function WorkOrdersScreen() {
  const [filter, setFilter] = useState<WorkOrderStatus | undefined>(undefined)
  const { data, isLoading, refetch, isRefetching } = useWorkOrders(filter)
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'COMMUNITY_ADMIN' || user?.role === 'SUPER_ADMIN' ||
    user?.communityRole === 'COMMUNITY_ADMIN' || user?.communityRole === 'SUPER_ADMIN'
  const isStaff = user?.communityRole === 'STAFF'
  const canCreate = !isStaff // residents and admins can report issues

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Header */}
      <View className="px-6 pt-2 pb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-white text-2xl font-bold">Órdenes de trabajo</Text>
          {data && (
            <Text className="text-surface-muted text-xs mt-0.5">
              {data.total} {data.total === 1 ? 'orden' : 'órdenes'} en total
            </Text>
          )}
        </View>
        {canCreate && (
          <TouchableOpacity
            onPress={() => router.push('/(app)/workorder/new' as any)}
            className="w-10 h-10 bg-primary-500 rounded-xl items-center justify-center"
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View className="flex-row px-6 gap-2 mb-3">
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            onPress={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full border ${
              filter === f.value
                ? 'bg-primary-500 border-primary-500'
                : 'border-surface-border bg-surface-card'
            }`}
          >
            <Text className={`text-xs font-medium ${filter === f.value ? 'text-white' : 'text-surface-muted'}`}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={data?.orders ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <WorkOrderCard order={item} />}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3B82F6" />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="construct-outline" size={48} color="#334155" />
              <Text className="text-surface-muted mt-3 text-base">No hay órdenes de trabajo</Text>
              {canCreate && (
                <TouchableOpacity
                  onPress={() => router.push('/(app)/workorder/new' as any)}
                  className="mt-4 bg-primary-500 px-5 py-2.5 rounded-xl"
                >
                  <Text className="text-white font-medium">Reportar un problema</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
