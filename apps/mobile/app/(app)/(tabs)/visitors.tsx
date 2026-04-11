import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { useVisitorPasses } from '../../../src/hooks/useVisitors'
import { useAuthStore } from '../../../src/stores/auth.store'
import type { VisitorPass, VisitorPassStatus } from '@chamanes/shared'
import { format } from 'date-fns'

const STATUS_COLORS: Record<VisitorPassStatus, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400',
  USED: 'bg-slate-500/20 text-slate-400',
  EXPIRED: 'bg-orange-500/20 text-orange-400',
  REVOKED: 'bg-red-500/20 text-red-400',
}

const FILTERS: { label: string; value?: VisitorPassStatus }[] = [
  { label: 'Todas' },
  { label: 'Activas', value: 'ACTIVE' },
  { label: 'Usadas', value: 'USED' },
  { label: 'Expiradas', value: 'EXPIRED' },
]

function PassCard({ pass }: { pass: VisitorPass }) {
  const statusClass = STATUS_COLORS[pass.status] ?? 'bg-slate-500/20 text-slate-400'
  const [bg, color] = statusClass.split(' ')

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/visitor/${pass.id}`)}
      className="bg-surface-card border border-surface-border rounded-2xl p-4 mb-3"
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-white font-semibold text-base">{pass.visitorName}</Text>
          {pass.plateNumber && (
            <Text className="text-surface-muted text-sm mt-0.5">
              <Ionicons name="car-outline" size={12} /> {pass.plateNumber}
            </Text>
          )}
        </View>
        <View className={`px-2 py-1 rounded-full ${bg}`}>
          <Text className={`text-xs font-medium ${color}`}>{pass.status}</Text>
        </View>
      </View>

      <View className="flex-row items-center mt-3 gap-4">
        <View className="flex-row items-center gap-1">
          <Ionicons name="time-outline" size={13} color="#64748B" />
          <Text className="text-surface-muted text-xs">
            Until {format(new Date(pass.validUntil), 'MMM d, h:mm a')}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="scan-outline" size={13} color="#64748B" />
          <Text className="text-surface-muted text-xs">
            {pass.usedCount}/{pass.maxUses} uses
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function VisitorsScreen() {
  const { user } = useAuthStore()
  const isGuard = user?.communityRole === 'GUARD'
  const isAdmin =
    user?.role === 'SUPER_ADMIN' ||
    user?.communityRole === 'COMMUNITY_ADMIN' ||
    user?.communityRole === 'MANAGER' ||
    user?.communityRole === 'SUPER_ADMIN'
  const [filter, setFilter] = useState<VisitorPassStatus | undefined>(undefined)

  const { data, isLoading, refetch, isRefetching } = useVisitorPasses(filter)

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-2 pb-4">
        <Text className="text-white text-2xl font-bold">Visitas</Text>
        {!isGuard && (
          <TouchableOpacity
            onPress={() => router.push('/(app)/visitor/new')}
            className="bg-primary-500 w-10 h-10 rounded-full items-center justify-center"
          >
            <Ionicons name="add" size={22} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View className="flex-row px-6 gap-2 mb-4">
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
            <Text
              className={`text-xs font-medium ${filter === f.value ? 'text-white' : 'text-surface-muted'}`}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={data?.passes ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PassCard pass={item} />}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#3B82F6"
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="people-outline" size={48} color="#334155" />
              <Text className="text-surface-muted mt-3 text-base">No hay pases de visita</Text>
              {!isGuard && (
                <TouchableOpacity
                  onPress={() => router.push('/(app)/visitor/new')}
                  className="mt-4 bg-primary-500 px-6 py-2.5 rounded-full"
                >
                  <Text className="text-white font-medium">Crear pase</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
