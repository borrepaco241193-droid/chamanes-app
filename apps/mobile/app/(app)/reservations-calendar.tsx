import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState, useMemo } from 'react'
import { Calendar, type DateData } from 'react-native-calendars'
import { useReservations } from '../../src/hooks/useReservations'
import { useAuthStore } from '../../src/stores/auth.store'
import { format, isSameDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Reservation } from '../../src/services/reservation.service'

// ── Helpers ───────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  PENDING:   '#F59E0B',
  CONFIRMED: '#10B981',
  CANCELLED: '#EF4444',
  COMPLETED: '#64748B',
  NO_SHOW:   '#64748B',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING:   'Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW:   'No asistió',
}

function toDateString(iso: string) {
  return iso.slice(0, 10) // 'YYYY-MM-DD'
}

// ── Day Card ──────────────────────────────────────────────────

function ReservationDayCard({ reservation }: { reservation: Reservation }) {
  const color = STATUS_COLOR[reservation.status] ?? '#64748B'
  const label = STATUS_LABEL[reservation.status] ?? reservation.status
  const start = parseISO(reservation.startTime)
  const end   = parseISO(reservation.endTime)

  return (
    <View style={{
      backgroundColor: '#1E293B',
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: `${color}40`,
      borderLeftWidth: 3,
      borderLeftColor: color,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 14, flex: 1 }}>
          {reservation.commonArea?.name ?? 'Área común'}
        </Text>
        <View style={{ backgroundColor: `${color}20`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label}</Text>
        </View>
      </View>

      {reservation.user && (
        <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>
          {reservation.user.firstName} {reservation.user.lastName}
        </Text>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Ionicons name="time-outline" size={13} color="#64748B" />
        <Text style={{ color: '#64748B', fontSize: 13 }}>
          {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
        </Text>
        {reservation.attendees > 1 && (
          <Text style={{ color: '#64748B', fontSize: 13 }}>· {reservation.attendees} personas</Text>
        )}
      </View>

      {reservation.feeAmount > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <Ionicons name="card-outline" size={13} color="#F59E0B" />
          <Text style={{ color: '#F59E0B', fontSize: 13 }}>
            ${reservation.feeAmount.toLocaleString('es-MX')} MXN
          </Text>
        </View>
      )}
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────

export default function ReservationsCalendarScreen() {
  const user = useAuthStore((s) => s.user)
  const isAdmin =
    user?.role === 'SUPER_ADMIN' ||
    user?.communityRole === 'COMMUNITY_ADMIN' ||
    user?.communityRole === 'MANAGER' ||
    user?.communityRole === 'SUPER_ADMIN'

  const today = format(new Date(), 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState(today)

  // Load all upcoming + past for calendar — admins see all
  const { data: allReservations, isLoading, refetch, isRefetching } = useReservations(
    isAdmin ? { all: true } : {},
  )

  const reservations = allReservations ?? []

  // Build marked dates for calendar
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {}

    for (const r of reservations) {
      const day = toDateString(r.startTime)
      const color = STATUS_COLOR[r.status] ?? '#64748B'
      if (!marks[day]) {
        marks[day] = { dots: [], selected: false, selectedColor: '#1E293B' }
      }
      // avoid duplicate dot colors
      if (!marks[day].dots.some((d: any) => d.color === color)) {
        marks[day].dots.push({ key: r.status, color })
      }
    }

    // Highlight selected day
    if (marks[selectedDate]) {
      marks[selectedDate].selected = true
      marks[selectedDate].selectedColor = '#3B82F6'
    } else {
      marks[selectedDate] = { selected: true, selectedColor: '#3B82F6', dots: [] }
    }

    return marks
  }, [reservations, selectedDate])

  // Filter reservations for the selected day
  const dayReservations = useMemo(() => {
    return reservations.filter((r) =>
      isSameDay(parseISO(r.startTime), parseISO(selectedDate + 'T00:00:00'))
    )
  }, [reservations, selectedDate])

  const selectedLabel = format(parseISO(selectedDate + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es })

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3B82F6" />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', flex: 1 }}>
            Calendario de reservaciones
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(app)/reservation/new' as any)}
            style={{ backgroundColor: '#3B82F6', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Calendar */}
        <View style={{ marginHorizontal: 16, marginBottom: 4, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#1E293B' }}>
          <Calendar
            current={today}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markingType="multi-dot"
            markedDates={markedDates}
            theme={{
              backgroundColor:             '#0F172A',
              calendarBackground:          '#0F172A',
              textSectionTitleColor:       '#64748B',
              selectedDayBackgroundColor:  '#3B82F6',
              selectedDayTextColor:        '#ffffff',
              todayTextColor:              '#3B82F6',
              dayTextColor:                '#CBD5E1',
              textDisabledColor:           '#334155',
              dotColor:                    '#3B82F6',
              selectedDotColor:            '#ffffff',
              arrowColor:                  '#3B82F6',
              monthTextColor:              '#F1F5F9',
              textDayFontWeight:           '500' as any,
              textMonthFontWeight:         '700' as any,
              textDayHeaderFontWeight:     '600' as any,
              textDayFontSize:             14,
              textMonthFontSize:           16,
            }}
          />
        </View>

        {/* Legend */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, marginTop: 12, marginBottom: 16 }}>
          {Object.entries({ PENDING: 'Pendiente', CONFIRMED: 'Confirmada', CANCELLED: 'Cancelada' }).map(([key, label]) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: STATUS_COLOR[key] }} />
              <Text style={{ color: '#64748B', fontSize: 11 }}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Day header */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 15, textTransform: 'capitalize' }}>
            {selectedLabel}
          </Text>
          <Text style={{ color: '#475569', fontSize: 13 }}>
            {dayReservations.length} {dayReservations.length === 1 ? 'reservación' : 'reservaciones'}
          </Text>
        </View>

        {/* Day reservations */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          {isLoading ? (
            <ActivityIndicator color="#3B82F6" style={{ marginTop: 20 }} />
          ) : dayReservations.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="calendar-outline" size={26} color="#334155" />
              </View>
              <Text style={{ color: '#64748B', fontSize: 14 }}>Sin reservaciones este día</Text>
              <TouchableOpacity
                onPress={() => router.push('/(app)/reservation/new' as any)}
                style={{ backgroundColor: '#3B82F620', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#3B82F640' }}
              >
                <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '600' }}>Reservar área</Text>
              </TouchableOpacity>
            </View>
          ) : (
            dayReservations.map((r) => <ReservationDayCard key={r.id} reservation={r} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
