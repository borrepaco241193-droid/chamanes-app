import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState, useEffect } from 'react'
import { useActiveShift, useShiftHistory, useStaffList, useCheckIn, useCheckOut } from '../../../src/hooks/useStaff'
import { useAuthStore } from '../../../src/stores/auth.store'
import { format, differenceInSeconds } from 'date-fns'
import { es } from 'date-fns/locale'
import type { StaffMember } from '../../../src/services/staff.service'

// ── Duration helpers ──────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ── Live Timer ────────────────────────────────────────────────

function useLiveDuration(startTime: string | null | undefined) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!startTime) { setSeconds(0); return }
    const update = () => setSeconds(differenceInSeconds(new Date(), new Date(startTime)))
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [startTime])

  return seconds
}

// ── Active Shift Card ─────────────────────────────────────────

function ActiveShiftCard({ checkInTime }: { checkInTime: string }) {
  const elapsed = useLiveDuration(checkInTime)

  return (
    <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5">
      <View className="flex-row items-center gap-2 mb-3">
        <View className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        <Text className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          En turno
        </Text>
      </View>
      <Text className="text-white text-4xl font-bold tracking-tight">
        {formatDuration(elapsed)}
      </Text>
      <Text className="text-emerald-300 text-sm mt-1">
        Inicio: {format(new Date(checkInTime), "HH:mm · EEEE d 'de' MMMM", { locale: es })}
      </Text>
    </View>
  )
}

// ── Shift History Row ─────────────────────────────────────────

function ShiftRow({ checkInTime, checkOutTime, hoursWorked }: {
  checkInTime: string
  checkOutTime: string
  hoursWorked: number | null
}) {
  return (
    <View className="flex-row items-center py-3 border-b border-surface-border">
      <View className="flex-1">
        <Text className="text-white text-sm font-medium">
          {format(new Date(checkInTime), "EEEE d 'de' MMMM", { locale: es })}
        </Text>
        <Text className="text-surface-muted text-xs mt-0.5">
          {format(new Date(checkInTime), 'HH:mm')} – {format(new Date(checkOutTime), 'HH:mm')}
        </Text>
      </View>
      {hoursWorked != null && (
        <View className="bg-surface-card border border-surface-border rounded-lg px-2.5 py-1">
          <Text className="text-white text-xs font-semibold">{formatHours(hoursWorked)}</Text>
        </View>
      )}
    </View>
  )
}

// ── Staff Member Card (admin view) ────────────────────────────

function StaffCard({ member }: { member: StaffMember }) {
  const isOnDuty = member.checkIns.length > 0
  const activeShift = isOnDuty ? member.checkIns[0] : null
  const elapsed = useLiveDuration(activeShift?.checkInTime ?? null)

  return (
    <View className="flex-row items-center py-3 border-b border-surface-border">
      {/* Avatar placeholder */}
      <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isOnDuty ? 'bg-emerald-500/20' : 'bg-surface-card'}`}>
        <Ionicons
          name="person-outline"
          size={18}
          color={isOnDuty ? '#10B981' : '#64748B'}
        />
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <View className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          <Text className="text-white text-sm font-medium">{member.position}</Text>
          {member.employeeId && (
            <Text className="text-surface-muted text-xs">#{member.employeeId}</Text>
          )}
        </View>
        {isOnDuty && activeShift ? (
          <Text className="text-emerald-400 text-xs mt-0.5">
            En turno · {formatDuration(elapsed)}
          </Text>
        ) : (
          <Text className="text-surface-muted text-xs mt-0.5">Fuera de turno</Text>
        )}
      </View>

      {isOnDuty && (
        <View className="bg-emerald-500/20 px-2 py-0.5 rounded-full">
          <Text className="text-emerald-400 text-xs font-medium">Activo</Text>
        </View>
      )}
    </View>
  )
}

// ── Check-In Modal ────────────────────────────────────────────

function CheckInModal({
  visible,
  onClose,
  onConfirm,
  isPending,
}: {
  visible: boolean
  onClose: () => void
  onConfirm: (notes?: string) => void
  isPending: boolean
}) {
  const [notes, setNotes] = useState('')

  function handleConfirm() {
    onConfirm(notes.trim() || undefined)
    setNotes('')
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <View className="bg-surface-card border border-surface-border rounded-2xl p-6 w-full">
          <Text className="text-white text-lg font-bold mb-1">Iniciar turno</Text>
          <Text className="text-surface-muted text-sm mb-4">
            {format(new Date(), "HH:mm · EEEE d 'de' MMMM", { locale: es })}
          </Text>

          <Text className="text-surface-muted text-xs font-medium uppercase tracking-wider mb-1.5">
            Notas (opcional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Ej. Turno nocturno, zona norte..."
            placeholderTextColor="#475569"
            maxLength={300}
            className="bg-surface border border-surface-border rounded-xl px-4 py-3 text-white text-sm mb-5"
          />

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 border border-surface-border rounded-xl py-3 items-center"
              activeOpacity={0.75}
            >
              <Text className="text-surface-muted font-medium">Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isPending}
              className="flex-1 bg-emerald-500 rounded-xl py-3 items-center"
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-semibold">Iniciar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ── Main Screen ───────────────────────────────────────────────

export default function StaffScreen() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'COMMUNITY_ADMIN' || user?.role === 'SUPER_ADMIN' ||
    user?.communityRole === 'COMMUNITY_ADMIN' || user?.communityRole === 'SUPER_ADMIN'
  const isStaffOrGuard = user?.communityRole === 'STAFF' || user?.communityRole === 'GUARD'

  const { data: shiftData, isLoading: shiftLoading, refetch: refetchShift, isRefetching } = useActiveShift()
  const { data: history, refetch: refetchHistory } = useShiftHistory()
  const { data: staffList, isLoading: staffLoading, refetch: refetchStaff } = useStaffList()
  const { mutateAsync: doCheckIn, isPending: checkingIn } = useCheckIn()
  const { mutateAsync: doCheckOut, isPending: checkingOut } = useCheckOut()

  const [showCheckInModal, setShowCheckInModal] = useState(false)

  const activeShift = shiftData?.activeShift ?? null
  const isOnDuty = !!activeShift

  function handleRefresh() {
    refetchShift()
    refetchHistory()
    if (isAdmin) refetchStaff()
  }

  async function handleCheckIn(notes?: string) {
    try {
      await doCheckIn({ notes })
      setShowCheckInModal(false)
    } catch (err: any) {
      setShowCheckInModal(false)
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo registrar la entrada.')
    }
  }

  function handleCheckOut() {
    Alert.alert(
      'Finalizar turno',
      '¿Seguro que quieres finalizar tu turno?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            try {
              await doCheckOut({})
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo registrar la salida.')
            }
          },
        },
      ],
    )
  }

  const isLoading = shiftLoading || (isAdmin && staffLoading)
  const onDutyCount = staffList?.filter((s) => s.checkIns.length > 0).length ?? 0

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
            <Text className="text-white text-2xl font-bold">
              {isAdmin ? 'Personal' : 'Mi turno'}
            </Text>
            <Text className="text-surface-muted text-xs mt-0.5">
              {isAdmin
                ? `${onDutyCount} en turno ahora`
                : format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {isAdmin && (
              <TouchableOpacity
                onPress={() => router.push('/(app)/residents' as any)}
                style={{ backgroundColor: '#3B82F620', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#3B82F640' }}
                activeOpacity={0.75}
              >
                <Ionicons name="person-add-outline" size={15} color="#3B82F6" />
                <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '700' }}>Agregar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleRefresh}
              className="w-9 h-9 bg-surface-card border border-surface-border rounded-xl items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View className="items-center justify-center py-24">
            <ActivityIndicator color="#3B82F6" size="large" />
          </View>
        ) : (
          <View className="px-6 gap-4 pb-8">

            {/* ── Staff / Guard personal shift UI ── */}
            {(isStaffOrGuard || (!isAdmin && !isStaffOrGuard)) && (
              <>
                {/* Current shift status */}
                {isOnDuty && activeShift ? (
                  <ActiveShiftCard checkInTime={activeShift.checkInTime} />
                ) : (
                  <View className="bg-slate-500/10 border border-slate-500/20 rounded-2xl p-5">
                    <View className="flex-row items-center gap-2 mb-2">
                      <View className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                      <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        Sin turno activo
                      </Text>
                    </View>
                    <Text className="text-white text-lg font-semibold">No has iniciado turno</Text>
                    <Text className="text-surface-muted text-sm mt-1">
                      Toca el botón para registrar tu entrada.
                    </Text>
                  </View>
                )}

                {/* Check-in / Check-out button */}
                {isOnDuty ? (
                  <TouchableOpacity
                    onPress={handleCheckOut}
                    disabled={checkingOut}
                    className="bg-red-500/10 border border-red-500/30 rounded-2xl py-4 flex-row items-center justify-center gap-2"
                    activeOpacity={0.8}
                  >
                    {checkingOut ? (
                      <ActivityIndicator color="#EF4444" />
                    ) : (
                      <>
                        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                        <Text className="text-red-400 font-semibold text-base">Finalizar turno</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowCheckInModal(true)}
                    disabled={checkingIn}
                    className="bg-emerald-500 rounded-2xl py-4 flex-row items-center justify-center gap-2"
                    activeOpacity={0.8}
                  >
                    {checkingIn ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Ionicons name="log-in-outline" size={20} color="white" />
                        <Text className="text-white font-semibold text-base">Iniciar turno</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* Shift history */}
                {history && history.length > 0 && (
                  <View className="bg-surface-card border border-surface-border rounded-2xl px-4">
                    <Text className="text-white font-semibold pt-4 pb-2">Historial de turnos</Text>
                    {history.map((shift) => (
                      shift.checkOutTime ? (
                        <ShiftRow
                          key={shift.id}
                          checkInTime={shift.checkInTime}
                          checkOutTime={shift.checkOutTime}
                          hoursWorked={shift.hoursWorked ?? null}
                        />
                      ) : null
                    ))}
                    <View className="h-2" />
                  </View>
                )}

                {(!history || history.length === 0) && (
                  <View className="items-center py-6">
                    <Ionicons name="time-outline" size={36} color="#334155" />
                    <Text className="text-surface-muted text-sm mt-2">Sin historial de turnos</Text>
                  </View>
                )}
              </>
            )}

            {/* ── Admin staff roster ── */}
            {isAdmin && staffList && (
              <>
                {/* On duty section */}
                {onDutyCount > 0 && (
                  <View className="bg-surface-card border border-surface-border rounded-2xl px-4">
                    <View className="flex-row items-center gap-2 pt-4 pb-2">
                      <View className="w-2 h-2 rounded-full bg-emerald-400" />
                      <Text className="text-white font-semibold">
                        En turno ({onDutyCount})
                      </Text>
                    </View>
                    {staffList
                      .filter((m) => m.checkIns.length > 0)
                      .map((m) => <StaffCard key={m.id} member={m} />)}
                    <View className="h-2" />
                  </View>
                )}

                {/* Full roster */}
                <View className="bg-surface-card border border-surface-border rounded-2xl px-4">
                  <Text className="text-white font-semibold pt-4 pb-2">
                    Todo el personal ({staffList.length})
                  </Text>
                  {staffList.length === 0 ? (
                    <View className="items-center py-6">
                      <Ionicons name="people-outline" size={36} color="#334155" />
                      <Text className="text-surface-muted text-sm mt-2">Sin personal registrado</Text>
                    </View>
                  ) : (
                    staffList.map((m) => <StaffCard key={m.id} member={m} />)
                  )}
                  <View className="h-2" />
                </View>
              </>
            )}

          </View>
        )}
      </ScrollView>

      <CheckInModal
        visible={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        onConfirm={handleCheckIn}
        isPending={checkingIn}
      />
    </SafeAreaView>
  )
}
