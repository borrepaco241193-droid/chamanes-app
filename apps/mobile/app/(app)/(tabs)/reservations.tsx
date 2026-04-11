import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { useReservations, useCancelReservation } from '../../../src/hooks/useReservations'
import { format } from 'date-fns'
import type { Reservation } from '../../../src/services/reservation.service'

const STATUS_CONFIG = {
  PENDING: { label: 'Pendiente aprobación', bg: 'bg-orange-500/20', text: 'text-orange-400' },
  CONFIRMED: { label: 'Confirmada', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  CANCELLED: { label: 'Cancelada', bg: 'bg-red-500/20', text: 'text-red-400' },
  COMPLETED: { label: 'Completada', bg: 'bg-slate-500/20', text: 'text-slate-400' },
  NO_SHOW: { label: 'No asistió', bg: 'bg-slate-500/20', text: 'text-slate-400' },
}

function ReservationCard({
  reservation,
  onCancel,
}: {
  reservation: Reservation
  onCancel: (id: string) => void
}) {
  const cfg = STATUS_CONFIG[reservation.status] ?? STATUS_CONFIG.PENDING
  const isUpcoming = new Date(reservation.startTime) > new Date()
  const canCancel = isUpcoming && ['PENDING', 'CONFIRMED'].includes(reservation.status)

  return (
    <View className="bg-surface-card border border-surface-border rounded-2xl p-4 mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <Text className="text-white font-semibold text-base flex-1">
          {reservation.commonArea?.name ?? 'Área común'}
        </Text>
        <View className={`px-2 py-1 rounded-full ${cfg.bg}`}>
          <Text className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2 mb-1">
        <Ionicons name="calendar-outline" size={13} color="#64748B" />
        <Text className="text-surface-muted text-sm">
          {format(new Date(reservation.startTime), 'EEEE d MMM yyyy')}
        </Text>
      </View>
      <View className="flex-row items-center gap-2 mb-3">
        <Ionicons name="time-outline" size={13} color="#64748B" />
        <Text className="text-surface-muted text-sm">
          {format(new Date(reservation.startTime), 'HH:mm')} –{' '}
          {format(new Date(reservation.endTime), 'HH:mm')}
        </Text>
        {reservation.attendees > 1 && (
          <Text className="text-surface-muted text-sm">· {reservation.attendees} personas</Text>
        )}
      </View>

      {canCancel && (
        <TouchableOpacity
          onPress={() => onCancel(reservation.id)}
          className="border border-red-500/30 rounded-xl py-2 items-center"
        >
          <Text className="text-red-400 text-sm font-medium">Cancelar reservación</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default function ReservationsScreen() {
  const [upcoming, setUpcoming] = useState(true)
  const { data: reservations, isLoading, refetch, isRefetching } = useReservations(upcoming)
  const { mutateAsync: cancelReservation } = useCancelReservation()

  async function handleCancel(id: string) {
    Alert.alert(
      'Cancelar reservación',
      '¿Estás seguro de que deseas cancelar esta reservación?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelReservation({ id })
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo cancelar')
            }
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-2 pb-4">
        <Text className="text-white text-2xl font-bold">Reservaciones</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => router.push('/(app)/reservations-calendar' as any)}
            className="bg-surface-card border border-surface-border w-10 h-10 rounded-full items-center justify-center"
          >
            <Ionicons name="calendar-outline" size={18} color="#94A3B8" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(app)/reservation/new')}
            className="bg-primary-500 w-10 h-10 rounded-full items-center justify-center"
          >
            <Ionicons name="add" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Toggle upcoming/past */}
      <View className="flex-row mx-6 mb-4 bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        <TouchableOpacity
          onPress={() => setUpcoming(true)}
          className={`flex-1 py-2.5 items-center ${upcoming ? 'bg-primary-500' : ''}`}
        >
          <Text className={`text-sm font-medium ${upcoming ? 'text-white' : 'text-surface-muted'}`}>
            Próximas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setUpcoming(false)}
          className={`flex-1 py-2.5 items-center ${!upcoming ? 'bg-primary-500' : ''}`}
        >
          <Text className={`text-sm font-medium ${!upcoming ? 'text-white' : 'text-surface-muted'}`}>
            Historial
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={reservations ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReservationCard reservation={item} onCancel={handleCancel} />
          )}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3B82F6" />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="calendar-outline" size={48} color="#334155" />
              <Text className="text-surface-muted mt-3 text-base">
                {upcoming ? 'No tienes reservaciones próximas' : 'Sin historial de reservaciones'}
              </Text>
              {upcoming && (
                <TouchableOpacity
                  onPress={() => router.push('/(app)/reservation/new')}
                  className="mt-4 bg-primary-500 px-6 py-2.5 rounded-full"
                >
                  <Text className="text-white font-medium">Reservar área</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
