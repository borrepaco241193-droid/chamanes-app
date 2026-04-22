import {
  View, Text, TouchableOpacity, FlatList, RefreshControl, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../src/lib/api'
import { useAuthStore } from '../../src/stores/auth.store'

type ManualVisit = {
  id: string
  visitorName: string
  passengers: number | null
  unitNumber: string
  hostName: string
  ineName: string | null
  plateText: string | null
  carModel: string | null
  carColor: string | null
  isInside: boolean
  entryAt: string
  exitAt: string | null
  registeredBy: { firstName: string; lastName: string }
}

function VisitCard({ visit, onExit }: { visit: ManualVisit; onExit: (id: string) => void }) {
  const inside = visit.isInside

  return (
    <View className={`bg-surface-card rounded-2xl p-4 mb-3 border ${inside ? 'border-emerald-500/30' : 'border-surface-border'}`}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <View className={`w-2 h-2 rounded-full ${inside ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            <Text className="text-white font-bold text-base">{visit.visitorName}</Text>
            {visit.passengers && visit.passengers > 1 && (
              <View className="bg-slate-700 px-2 py-0.5 rounded-full">
                <Text className="text-slate-300 text-xs">+{visit.passengers - 1} más</Text>
              </View>
            )}
          </View>
          <Text className="text-surface-muted text-sm">
            Casa {visit.unitNumber} · {visit.hostName}
          </Text>
          {visit.plateText && (
            <View className="flex-row items-center gap-1 mt-1">
              <Ionicons name="car-outline" size={12} color="#64748b" />
              <Text className="text-surface-muted text-xs">
                {visit.plateText}{visit.carModel ? ` · ${visit.carModel}` : ''}{visit.carColor ? ` · ${visit.carColor}` : ''}
              </Text>
            </View>
          )}
        </View>

        {inside && (
          <TouchableOpacity
            onPress={() => onExit(visit.id)}
            className="bg-red-500/20 border border-red-500/40 rounded-xl px-3 py-2 ml-3"
          >
            <View className="flex-row items-center gap-1">
              <Ionicons name="exit-outline" size={14} color="#f87171" />
              <Text className="text-red-400 text-xs font-semibold">Dar salida</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <View className="flex-row items-center gap-4 mt-3 pt-3 border-t border-surface-border">
        <View className="flex-row items-center gap-1">
          <Ionicons name="enter-outline" size={12} color="#10b981" />
          <Text className="text-emerald-400 text-xs">
            {format(new Date(visit.entryAt), 'HH:mm')} · {formatDistanceToNow(new Date(visit.entryAt), { locale: es, addSuffix: true })}
          </Text>
        </View>
        {visit.exitAt && (
          <View className="flex-row items-center gap-1">
            <Ionicons name="exit-outline" size={12} color="#94a3b8" />
            <Text className="text-surface-muted text-xs">{format(new Date(visit.exitAt), 'HH:mm')}</Text>
          </View>
        )}
      </View>

      <Text className="text-slate-600 text-xs mt-1">
        Registrado por {visit.registeredBy.firstName} {visit.registeredBy.lastName}
      </Text>
    </View>
  )
}

export default function ManualVisitsScreen() {
  const { activeCommunityIds, user } = useAuthStore()
  const communityId = activeCommunityIds[0] ?? user?.communityId ?? ''
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'inside' | 'all'>('inside')

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['manual-visits', communityId],
    queryFn: async () => {
      const { data } = await api.get(`/communities/${communityId}/gate/manual-visits`)
      return data.visits as ManualVisit[]
    },
    refetchInterval: 15000,
  })

  const exitMutation = useMutation({
    mutationFn: async (visitId: string) => {
      await api.post(`/communities/${communityId}/gate/manual-exit/${visitId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-visits', communityId] })
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo registrar la salida.')
    },
  })

  const handleExit = useCallback((visitId: string) => {
    Alert.alert(
      'Registrar salida',
      '¿Confirmas la salida del visitante? Se abrirá la puerta de salida.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Dar salida', style: 'destructive', onPress: () => exitMutation.mutate(visitId) },
      ],
    )
  }, [exitMutation])

  const visits = data ?? []
  const filtered = filter === 'inside' ? visits.filter((v) => v.isInside) : visits
  const insideCount = visits.filter((v) => v.isInside).length

  return (
    <SafeAreaView className="flex-1 bg-surface-bg">
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-4 border-b border-surface-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="#f1f5f9" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-lg font-bold">Visitas activas</Text>
          <Text className="text-surface-muted text-xs">
            {insideCount} {insideCount === 1 ? 'persona adentro' : 'personas adentro'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(app)/manual-entry')}
          className="bg-primary-500 px-3 py-2 rounded-xl flex-row items-center gap-1"
        >
          <Ionicons name="add" size={16} color="white" />
          <Text className="text-white text-sm font-semibold">Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View className="flex-row mx-5 mt-4 mb-3 bg-slate-800 rounded-xl p-1">
        {(['inside', 'all'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setFilter(tab)}
            className={`flex-1 py-2 rounded-lg items-center ${filter === tab ? 'bg-primary-500' : ''}`}
          >
            <Text className={`text-sm font-medium ${filter === tab ? 'text-white' : 'text-surface-muted'}`}>
              {tab === 'inside' ? `Adentro (${insideCount})` : `Todos (${visits.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <VisitCard visit={item} onExit={handleExit} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="people-outline" size={48} color="#334155" />
              <Text className="text-slate-500 mt-3 text-center">
                {filter === 'inside' ? 'No hay visitas activas' : 'No hay visitas registradas hoy'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
