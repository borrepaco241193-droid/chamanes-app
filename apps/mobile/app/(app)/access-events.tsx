import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { useAccessEvents } from '../../src/hooks/useAdmin'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { AccessEvent } from '../../src/services/admin.service'

// ── Constants ─────────────────────────────────────────────────

const TYPE_FILTER = [
  { label: 'Todos', value: undefined },
  { label: 'Entradas', value: 'ENTRY' },
  { label: 'Salidas', value: 'EXIT' },
]

const METHOD_LABEL: Record<string, string> = {
  APP:              'App',
  QR_CODE:          'QR',
  MANUAL_GUARD:     'Guardia',
  PLATE_RECOGNITION:'Placa',
}

const PERSON_TYPE_LABEL: Record<string, string> = {
  RESIDENT: 'Residente',
  VISITOR:  'Visitante',
  STAFF:    'Personal',
  GUARD:    'Guardia',
}

// ── Event Card ────────────────────────────────────────────────

function EventCard({ event }: { event: AccessEvent }) {
  const isEntry   = event.type === 'ENTRY'
  const isAllowed = event.isAllowed
  const typeColor = isAllowed ? (isEntry ? '#3B82F6' : '#94A3B8') : '#EF4444'
  const typeBg    = isAllowed ? (isEntry ? '#3B82F620' : '#94A3B820') : '#EF444420'
  const typeIcon  = isAllowed
    ? (isEntry ? 'enter-outline' : 'exit-outline')
    : 'close-circle-outline'

  return (
    <View style={{
      backgroundColor: '#1E293B',
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isAllowed ? '#334155' : '#EF444430',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* Icon */}
        <View style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: typeBg, alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name={typeIcon as any} size={20} color={typeColor} />
        </View>

        {/* Main info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
              {event.personName}
            </Text>
            <View style={{ backgroundColor: typeBg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: typeColor, fontSize: 10, fontWeight: '600' }}>
                {isAllowed ? (isEntry ? 'ENTRADA' : 'SALIDA') : 'DENEGADO'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 3 }}>
            <Text style={{ color: '#64748B', fontSize: 12 }}>
              {PERSON_TYPE_LABEL[event.personType] ?? event.personType}
            </Text>
            <Text style={{ color: '#475569', fontSize: 12 }}>·</Text>
            <Text style={{ color: '#64748B', fontSize: 12 }}>
              {METHOD_LABEL[event.method] ?? event.method}
            </Text>
            {event.plateNumber && (
              <>
                <Text style={{ color: '#475569', fontSize: 12 }}>·</Text>
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>{event.plateNumber}</Text>
              </>
            )}
          </View>

          {event.deniedReason && (
            <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 3 }}>
              Motivo: {event.deniedReason}
            </Text>
          )}
          {event.visitorPass && (
            <Text style={{ color: '#8B5CF6', fontSize: 11, marginTop: 3 }}>
              Pase: {event.visitorPass.visitorName}
            </Text>
          )}
        </View>

        {/* Timestamp */}
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600' }}>
            {format(new Date(event.createdAt), 'HH:mm')}
          </Text>
          <Text style={{ color: '#475569', fontSize: 10, marginTop: 2 }}>
            {format(new Date(event.createdAt), 'd MMM', { locale: es })}
          </Text>
        </View>
      </View>
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────

export default function AccessEventsScreen() {
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined)
  const [page, setPage]             = useState(1)

  const { data, isLoading, isFetching, refetch } = useAccessEvents({
    page,
    type: typeFilter,
    limit: 30,
  })

  const events = data?.events ?? []
  const total  = data?.total  ?? 0
  const pages  = data?.pages  ?? 1

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: '800' }}>Registro de accesos</Text>
          <Text style={{ color: '#64748B', fontSize: 12, marginTop: 1 }}>
            {total} eventos en total
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => refetch()}
          style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 }}>
        {TYPE_FILTER.map((f) => {
          const active = typeFilter === f.value
          return (
            <TouchableOpacity
              key={f.label}
              onPress={() => { setTypeFilter(f.value); setPage(1) }}
              style={{
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                backgroundColor: active ? '#3B82F6' : '#1E293B',
                borderWidth: 1, borderColor: active ? '#3B82F6' : '#334155',
              }}
            >
              <Text style={{ color: active ? 'white' : '#94A3B8', fontSize: 13, fontWeight: active ? '700' : '400' }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      ) : events.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="swap-horizontal-outline" size={56} color="#334155" />
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginTop: 16 }}>Sin eventos</Text>
          <Text style={{ color: '#64748B', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
            No hay eventos de acceso registrados para el filtro seleccionado.
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor="#3B82F6" />
          }
          ListFooterComponent={
            pages > 1 ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#1E293B', borderRadius: 10, borderWidth: 1, borderColor: '#334155', opacity: page <= 1 ? 0.4 : 1 }}
                >
                  <Text style={{ color: 'white', fontSize: 13 }}>← Anterior</Text>
                </TouchableOpacity>
                <Text style={{ color: '#64748B', fontSize: 12 }}>Pág. {page} / {pages}</Text>
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#1E293B', borderRadius: 10, borderWidth: 1, borderColor: '#334155', opacity: page >= pages ? 0.4 : 1 }}
                >
                  <Text style={{ color: 'white', fontSize: 13 }}>Siguiente →</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  )
}
