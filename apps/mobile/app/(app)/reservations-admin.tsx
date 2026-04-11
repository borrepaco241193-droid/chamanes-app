import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { useReservations, useApproveReservation, useCancelReservation } from '../../src/hooks/useReservations'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Reservation } from '../../src/services/reservation.service'

const FILTERS = [
  { label: 'Por aprobar', value: 'PENDING', color: '#F59E0B' },
  { label: 'Confirmadas', value: 'CONFIRMED', color: '#10B981' },
  { label: 'Todas',       value: undefined,  color: '#94A3B8' },
]

function ReservationAdminCard({
  reservation,
  onApprove,
  onReject,
}: {
  reservation: Reservation
  onApprove: (id: string) => void
  onReject:  (id: string) => void
}) {
  const isPending   = reservation.status === 'PENDING'
  const isConfirmed = reservation.status === 'CONFIRMED'

  return (
    <View style={{
      backgroundColor: '#1E293B',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isPending ? '#F59E0B40' : '#334155',
    }}>
      {/* Area + status */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
          </View>
          <View>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
              {reservation.commonArea?.name ?? 'Área común'}
            </Text>
            {reservation.user && (
              <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                {reservation.user.firstName} {reservation.user.lastName}
              </Text>
            )}
          </View>
        </View>
        <View style={{
          backgroundColor: isPending ? '#F59E0B20' : '#10B98120',
          borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
        }}>
          <Text style={{ color: isPending ? '#F59E0B' : '#10B981', fontSize: 11, fontWeight: '700' }}>
            {isPending ? 'PENDIENTE' : 'CONFIRMADA'}
          </Text>
        </View>
      </View>

      {/* Date/time */}
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: isPending ? 14 : 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="calendar-outline" size={13} color="#64748B" />
          <Text style={{ color: '#94A3B8', fontSize: 13 }}>
            {format(new Date(reservation.startTime), "d MMM yyyy", { locale: es })}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="time-outline" size={13} color="#64748B" />
          <Text style={{ color: '#94A3B8', fontSize: 13 }}>
            {format(new Date(reservation.startTime), 'HH:mm')} – {format(new Date(reservation.endTime), 'HH:mm')}
          </Text>
        </View>
      </View>

      {reservation.notes && (
        <Text style={{ color: '#64748B', fontSize: 12, marginBottom: isPending ? 0 : 0, marginTop: 6 }}>
          Nota: {reservation.notes}
        </Text>
      )}

      {/* Approve/Reject buttons — only for PENDING */}
      {isPending && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <TouchableOpacity
            onPress={() => onReject(reservation.id)}
            style={{ flex: 1, backgroundColor: '#EF444420', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#EF444440' }}
            activeOpacity={0.75}
          >
            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 13 }}>Rechazar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onApprove(reservation.id)}
            style={{ flex: 1, backgroundColor: '#10B98120', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#10B98140' }}
            activeOpacity={0.75}
          >
            <Text style={{ color: '#10B981', fontWeight: '700', fontSize: 13 }}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

export default function ReservationsAdminScreen() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>('PENDING')
  const { data, isLoading, isFetching, refetch } = useReservations({
    all: true,
    status: statusFilter,
  })
  const { mutateAsync: approveRes } = useApproveReservation()
  const { mutateAsync: cancelRes }  = useCancelReservation()

  const reservations = data ?? []

  async function handleApprove(id: string) {
    try {
      await approveRes({ id, approve: true })
      refetch()
    } catch {
      Alert.alert('Error', 'No se pudo confirmar la reservación')
    }
  }

  async function handleReject(id: string) {
    Alert.alert('Rechazar reservación', '¿Estás seguro? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar',
        style: 'destructive',
        onPress: async () => {
          try {
            await approveRes({ id, approve: false })
            refetch()
          } catch {
            Alert.alert('Error', 'No se pudo rechazar la reservación')
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: '800' }}>Gestionar reservaciones</Text>
          <Text style={{ color: '#64748B', fontSize: 12, marginTop: 1 }}>
            {reservations.length} resultado{reservations.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => refetch()}
          style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="refresh-outline" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 14 }}>
        {FILTERS.map((f) => {
          const active = statusFilter === f.value
          return (
            <TouchableOpacity
              key={f.label}
              onPress={() => setStatusFilter(f.value)}
              style={{
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                backgroundColor: active ? f.color : '#1E293B',
                borderWidth: 1, borderColor: active ? f.color : '#334155',
              }}
            >
              <Text style={{ color: active ? 'white' : '#94A3B8', fontSize: 13, fontWeight: active ? '700' : '400' }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      ) : reservations.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="calendar-outline" size={56} color="#334155" />
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginTop: 16 }}>
            {statusFilter === 'PENDING' ? 'Sin reservaciones pendientes' : 'Sin resultados'}
          </Text>
          <Text style={{ color: '#64748B', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
            {statusFilter === 'PENDING'
              ? 'Todas las reservaciones han sido revisadas.'
              : 'No hay reservaciones para este filtro.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <ReservationAdminCard
              reservation={item}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor="#3B82F6" />
          }
        />
      )}
    </SafeAreaView>
  )
}
