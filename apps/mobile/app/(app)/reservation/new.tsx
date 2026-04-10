import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { useCommonAreas, useTimeSlots, useCreateReservation } from '../../../src/hooks/useReservations'
import { format, addDays } from 'date-fns'
import type { CommonArea, TimeSlot } from '../../../src/services/reservation.service'

// Generate next N days for date picker
function generateDates(count = 14): Date[] {
  const dates: Date[] = []
  for (let i = 0; i < count; i++) {
    dates.push(addDays(new Date(), i))
  }
  return dates
}

const DATES = generateDates(14)

function AreaCard({
  area,
  selected,
  onSelect,
}: {
  area: CommonArea
  selected: boolean
  onSelect: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      className={`border rounded-2xl p-4 mr-3 w-44 ${selected ? 'border-primary-500 bg-primary-500/10' : 'border-surface-border bg-surface-card'}`}
      activeOpacity={0.7}
    >
      <View className="w-10 h-10 bg-primary-500/20 rounded-xl items-center justify-center mb-3">
        <Ionicons name="business-outline" size={20} color="#3B82F6" />
      </View>
      <Text className={`font-semibold text-sm ${selected ? 'text-white' : 'text-white'}`}>
        {area.name}
      </Text>
      <Text className="text-surface-muted text-xs mt-1">
        {area.openTime} – {area.closeTime}
      </Text>
      {area.capacity && (
        <Text className="text-surface-muted text-xs">Máx. {area.capacity} personas</Text>
      )}
      {area.hasFee && Number(area.feeAmount) > 0 && (
        <Text className="text-primary-400 text-xs mt-1">
          ${Number(area.feeAmount).toLocaleString('es-MX')} MXN
        </Text>
      )}
    </TouchableOpacity>
  )
}

function SlotButton({
  slot,
  selected,
  onSelect,
}: {
  slot: TimeSlot
  selected: boolean
  onSelect: () => void
}) {
  if (!slot.available && !selected) {
    return (
      <View className="border border-surface-border rounded-xl px-3 py-2 mr-2 mb-2 opacity-40">
        <Text className="text-surface-muted text-xs">
          {format(new Date(slot.startTime), 'HH:mm')}
        </Text>
      </View>
    )
  }

  return (
    <TouchableOpacity
      onPress={onSelect}
      disabled={!slot.available}
      className={`border rounded-xl px-3 py-2 mr-2 mb-2 ${selected ? 'bg-primary-500 border-primary-500' : 'border-primary-500/50 bg-primary-500/10'}`}
    >
      <Text className={`text-xs font-medium ${selected ? 'text-white' : 'text-primary-400'}`}>
        {format(new Date(slot.startTime), 'HH:mm')}
      </Text>
    </TouchableOpacity>
  )
}

export default function NewReservationScreen() {
  const { data: areas, isLoading: areasLoading } = useCommonAreas()
  const { mutateAsync: createReservation, isPending } = useCreateReservation()

  const [selectedArea, setSelectedArea] = useState<CommonArea | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1))
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [attendees, setAttendees] = useState('1')
  const [notes, setNotes] = useState('')

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const { data: slotsData, isLoading: slotsLoading } = useTimeSlots(
    selectedArea?.id ?? '',
    dateStr,
  )

  async function handleSubmit() {
    if (!selectedArea) {
      Alert.alert('Requerido', 'Selecciona un área')
      return
    }
    if (!selectedSlot) {
      Alert.alert('Requerido', 'Selecciona un horario')
      return
    }

    try {
      await createReservation({
        commonAreaId: selectedArea.id,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        attendees: parseInt(attendees) || 1,
        notes: notes.trim() || undefined,
      })
      Alert.alert(
        selectedArea.requiresApproval ? 'Solicitud enviada' : 'Reservación confirmada',
        selectedArea.requiresApproval
          ? 'Tu solicitud está pendiente de aprobación por el administrador.'
          : `${selectedArea.name} reservada para el ${format(new Date(selectedSlot.startTime), 'd MMM a HH:mm')}`,
        [{ text: 'OK', onPress: () => router.back() }],
      )
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo crear la reservación')
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center px-6 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-surface-card items-center justify-center mr-3"
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Nueva Reservación</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Step 1: Select area */}
        <View className="mb-6">
          <Text className="text-white font-semibold text-base px-6 mb-3">1. Elige el área</Text>
          {areasLoading ? (
            <ActivityIndicator color="#3B82F6" style={{ marginLeft: 24 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24 }}
            >
              {(areas ?? []).map((area) => (
                <AreaCard
                  key={area.id}
                  area={area}
                  selected={selectedArea?.id === area.id}
                  onSelect={() => {
                    setSelectedArea(area)
                    setSelectedSlot(null)
                  }}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Step 2: Select date */}
        <View className="mb-6">
          <Text className="text-white font-semibold text-base px-6 mb-3">2. Elige la fecha</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}
          >
            {DATES.map((date) => {
              const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  onPress={() => {
                    setSelectedDate(date)
                    setSelectedSlot(null)
                  }}
                  className={`items-center mr-3 w-14 py-2 rounded-2xl border ${isSelected ? 'bg-primary-500 border-primary-500' : 'border-surface-border bg-surface-card'}`}
                >
                  <Text
                    className={`text-xs ${isSelected ? 'text-white/80' : 'text-surface-muted'}`}
                  >
                    {format(date, 'EEE')}
                  </Text>
                  <Text
                    className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-white'}`}
                  >
                    {format(date, 'd')}
                  </Text>
                  <Text
                    className={`text-xs ${isSelected ? 'text-white/80' : 'text-surface-muted'}`}
                  >
                    {format(date, 'MMM')}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* Step 3: Select time slot */}
        {selectedArea && (
          <View className="mb-6 px-6">
            <Text className="text-white font-semibold text-base mb-3">3. Elige el horario</Text>
            {slotsLoading ? (
              <ActivityIndicator color="#3B82F6" />
            ) : (
              <View className="flex-row flex-wrap">
                {(slotsData?.slots ?? []).map((slot) => (
                  <SlotButton
                    key={slot.startTime}
                    slot={slot}
                    selected={selectedSlot?.startTime === slot.startTime}
                    onSelect={() => setSelectedSlot(slot)}
                  />
                ))}
                {(slotsData?.slots ?? []).length === 0 && (
                  <Text className="text-surface-muted text-sm">No hay horarios disponibles</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Step 4: Attendees + notes */}
        {selectedSlot && (
          <View className="px-6 mb-6">
            <Text className="text-white font-semibold text-base mb-3">4. Detalles</Text>

            <View className="mb-4">
              <Text className="text-surface-muted text-xs font-medium uppercase tracking-wider mb-1.5">
                Número de asistentes
              </Text>
              <View className="flex-row gap-2">
                {['1', '2', '3', '4', '5+'].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setAttendees(n === '5+' ? '5' : n)}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${attendees === (n === '5+' ? '5' : n) ? 'bg-primary-500 border-primary-500' : 'border-surface-border bg-surface-card'}`}
                  >
                    <Text
                      className={`font-semibold text-sm ${attendees === (n === '5+' ? '5' : n) ? 'text-white' : 'text-surface-muted'}`}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-surface-muted text-xs font-medium uppercase tracking-wider mb-1.5">
                Notas (opcional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Ej: Fiesta de cumpleaños, necesito llave extra..."
                placeholderTextColor="#475569"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-white text-base min-h-[80px]"
              />
            </View>
          </View>
        )}

        {/* Summary */}
        {selectedArea && selectedSlot && (
          <View className="mx-6 mb-4 bg-primary-500/10 border border-primary-500/30 rounded-2xl p-4">
            <Text className="text-primary-400 text-xs font-medium uppercase tracking-wider mb-2">Resumen</Text>
            <Text className="text-white font-semibold">{selectedArea.name}</Text>
            <Text className="text-surface-muted text-sm">
              {format(new Date(selectedSlot.startTime), "EEEE d 'de' MMMM")}
            </Text>
            <Text className="text-surface-muted text-sm">
              {format(new Date(selectedSlot.startTime), 'HH:mm')} –{' '}
              {format(new Date(selectedSlot.endTime), 'HH:mm')}
            </Text>
            {selectedArea.requiresApproval && (
              <Text className="text-orange-400 text-xs mt-2">
                Requiere aprobación del administrador
              </Text>
            )}
          </View>
        )}

        <View className="h-32" />
      </ScrollView>

      {/* Submit */}
      <View className="px-6 pb-6 pt-3 border-t border-surface-border absolute bottom-0 left-0 right-0 bg-surface">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!selectedArea || !selectedSlot || isPending}
          className={`rounded-2xl py-4 items-center ${selectedArea && selectedSlot ? 'bg-primary-500' : 'bg-surface-card'}`}
          activeOpacity={0.8}
        >
          {isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text
              className={`font-semibold text-base ${selectedArea && selectedSlot ? 'text-white' : 'text-surface-muted'}`}
            >
              Confirmar Reservación
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
