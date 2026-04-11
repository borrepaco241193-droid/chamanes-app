import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { useReservations, useApproveReservation } from '../../src/hooks/useReservations'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Reservation } from '../../src/services/reservation.service'

// ── Types ─────────────────────────────────────────────────────

interface ApproveState {
  reservationId: string
  residentName:  string
  areaName:      string
  date:          string
}

// ── Constants ─────────────────────────────────────────────────

const FILTERS = [
  { label: 'Por aprobar', value: 'PENDING',   color: '#F59E0B' },
  { label: 'Confirmadas', value: 'CONFIRMED', color: '#10B981' },
  { label: 'Todas',       value: undefined,   color: '#94A3B8' },
]

// ── Card ──────────────────────────────────────────────────────

function ReservationAdminCard({
  reservation,
  onApprove,
  onReject,
}: {
  reservation: Reservation
  onApprove:   (r: Reservation) => void
  onReject:    (id: string)     => void
}) {
  const isPending   = reservation.status === 'PENDING'
  const isConfirmed = reservation.status === 'CONFIRMED'

  return (
    <View style={{
      backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: isPending ? '#F59E0B40' : '#334155',
    }}>
      {/* Area + status */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
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
          backgroundColor: isPending ? '#F59E0B20' : isConfirmed ? '#10B98120' : '#EF444420',
          borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
        }}>
          <Text style={{ color: isPending ? '#F59E0B' : isConfirmed ? '#10B981' : '#EF4444', fontSize: 11, fontWeight: '700' }}>
            {isPending ? 'PENDIENTE' : isConfirmed ? 'CONFIRMADA' : 'CANCELADA'}
          </Text>
        </View>
      </View>

      {/* Date / time */}
      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
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
        {(reservation.feeAmount ?? 0) > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="card-outline" size={13} color="#64748B" />
            <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '600' }}>
              ${Number(reservation.feeAmount).toFixed(0)} MXN
            </Text>
          </View>
        )}
      </View>

      {reservation.notes && (
        <Text style={{ color: '#64748B', fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
          "{reservation.notes}"
        </Text>
      )}

      {/* Action buttons — only for PENDING */}
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
            onPress={() => onApprove(reservation)}
            style={{ flex: 1, backgroundColor: '#10B98120', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#10B98140', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
            activeOpacity={0.75}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
            <Text style={{ color: '#10B981', fontWeight: '700', fontSize: 13 }}>Aprobar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ── Approve Modal ─────────────────────────────────────────────

function ApproveModal({
  visible,
  state,
  onConfirm,
  onClose,
}: {
  visible:   boolean
  state:     ApproveState | null
  onConfirm: (extraCharge: number | null, chargeNote: string) => void
  onClose:   () => void
}) {
  const [hasCharge,  setHasCharge]  = useState(false)
  const [chargeAmt,  setChargeAmt]  = useState('')
  const [chargeNote, setChargeNote] = useState('')

  function handleConfirm() {
    const amount = hasCharge && chargeAmt ? parseFloat(chargeAmt) : null
    if (hasCharge && (!chargeAmt || isNaN(amount!))) {
      Alert.alert('Monto inválido', 'Ingresa un monto numérico válido.')
      return
    }
    onConfirm(amount, chargeNote)
    // reset
    setHasCharge(false); setChargeAmt(''); setChargeNote('')
  }

  function handleClose() {
    setHasCharge(false); setChargeAmt(''); setChargeNote('')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000088' }}>
          <View style={{ backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            {/* Handle */}
            <View style={{ width: 40, height: 4, backgroundColor: '#334155', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

            <Text style={{ color: 'white', fontSize: 18, fontWeight: '800', marginBottom: 4 }}>Aprobar reservación</Text>
            {state && (
              <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
                {state.areaName} · {state.residentName} · {state.date}
              </Text>
            )}

            {/* Extra charge toggle */}
            <TouchableOpacity
              onPress={() => setHasCharge(!hasCharge)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                backgroundColor: hasCharge ? '#F59E0B15' : '#0F172A',
                borderRadius: 12, padding: 14, borderWidth: 1,
                borderColor: hasCharge ? '#F59E0B40' : '#334155',
                marginBottom: 16,
              }}
              activeOpacity={0.75}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 6,
                backgroundColor: hasCharge ? '#F59E0B' : '#334155',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {hasCharge && <Ionicons name="checkmark" size={14} color="white" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Agregar cargo extra</Text>
                <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>
                  Opcional · el residente recibirá un cobro adicional
                </Text>
              </View>
              <Ionicons name="card-outline" size={20} color={hasCharge ? '#F59E0B' : '#475569'} />
            </TouchableOpacity>

            {hasCharge && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Monto (MXN)</Text>
                <TextInput
                  value={chargeAmt}
                  onChangeText={setChargeAmt}
                  placeholder="ej. 500"
                  placeholderTextColor="#475569"
                  keyboardType="decimal-pad"
                  style={{
                    backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155',
                    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                    color: 'white', fontSize: 16, marginBottom: 10,
                  }}
                />
                <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Motivo del cargo (opcional)</Text>
                <TextInput
                  value={chargeNote}
                  onChangeText={setChargeNote}
                  placeholder="ej. Depósito de garantía, limpieza extra..."
                  placeholderTextColor="#475569"
                  multiline
                  numberOfLines={2}
                  style={{
                    backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155',
                    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                    color: 'white', fontSize: 14, textAlignVertical: 'top',
                  }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: '#3B82F615', borderRadius: 8, padding: 10 }}>
                  <Ionicons name="information-circle-outline" size={15} color="#3B82F6" />
                  <Text style={{ color: '#64748B', fontSize: 11, flex: 1 }}>
                    El cargo queda registrado. La notificación de pago por Stripe se agregará próximamente.
                  </Text>
                </View>
              </View>
            )}

            {/* Confirm / Cancel */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                onPress={handleClose}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#334155', alignItems: 'center' }}
                activeOpacity={0.75}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                style={{ flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: '#10B981', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                activeOpacity={0.75}
              >
                <Ionicons name="checkmark-circle" size={18} color="white" />
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                  {hasCharge ? `Aprobar + cobrar $${chargeAmt || '0'}` : 'Confirmar reservación'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ── Main Screen ───────────────────────────────────────────────

export default function ReservationsAdminScreen() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>('PENDING')
  const [approveState, setApproveState] = useState<ApproveState | null>(null)

  const { data, isLoading, isFetching, refetch } = useReservations({ all: true, status: statusFilter })
  const { mutateAsync: approveRes } = useApproveReservation()

  const reservations = data ?? []

  function handleApprovePress(reservation: Reservation) {
    setApproveState({
      reservationId: reservation.id,
      residentName:  reservation.user ? `${reservation.user.firstName} ${reservation.user.lastName}` : 'Residente',
      areaName:      reservation.commonArea?.name ?? 'Área común',
      date:          format(new Date(reservation.startTime), "d MMM yyyy", { locale: es }),
    })
  }

  async function handleApproveConfirm(extraCharge: number | null, chargeNote: string) {
    if (!approveState) return
    try {
      await approveRes({
        id:          approveState.reservationId,
        approve:     true,
        extraCharge: extraCharge ?? undefined,
        chargeNote:  chargeNote || undefined,
      })
      setApproveState(null)
      refetch()
      Alert.alert(
        'Reservación confirmada',
        extraCharge
          ? `Se confirmó y se registró un cargo adicional de $${extraCharge.toFixed(0)} MXN.\nLa notificación de pago al residente estará disponible próximamente.`
          : 'La reservación fue confirmada exitosamente.',
      )
    } catch {
      Alert.alert('Error', 'No se pudo confirmar la reservación')
    }
  }

  async function handleReject(id: string) {
    Alert.alert('Rechazar reservación', '¿Estás seguro? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar', style: 'destructive',
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
            {statusFilter === 'PENDING' ? 'Sin pendientes' : 'Sin resultados'}
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
              onApprove={handleApprovePress}
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

      {/* Approve modal with optional extra charge */}
      <ApproveModal
        visible={!!approveState}
        state={approveState}
        onConfirm={handleApproveConfirm}
        onClose={() => setApproveState(null)}
      />
    </SafeAreaView>
  )
}
