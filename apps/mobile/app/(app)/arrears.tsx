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
import { useArrears } from '../../src/hooks/useAdmin'
import type { UnitArrear } from '../../src/services/admin.service'

// ── Helpers ───────────────────────────────────────────────────

function formatMXN(amount: number) {
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 0 })} MXN`
}

function urgencyColor(monthsOverdue: number) {
  if (monthsOverdue >= 3) return { bg: '#EF444420', border: '#EF4444', text: '#EF4444', label: 'Crítico' }
  if (monthsOverdue >= 2) return { bg: '#F9731620', border: '#F97316', text: '#F97316', label: 'Alto' }
  if (monthsOverdue >= 1) return { bg: '#F59E0B20', border: '#F59E0B', text: '#F59E0B', label: 'Pendiente' }
  return { bg: '#3B82F620', border: '#3B82F6', text: '#3B82F6', label: 'Reciente' }
}

// ── Arrear Card ───────────────────────────────────────────────

function ArrearCard({ item, expanded, onToggle }: {
  item: UnitArrear
  expanded: boolean
  onToggle: () => void
}) {
  const urgency = urgencyColor(item.monthsOverdue)
  const residentName = item.resident
    ? `${item.resident.firstName} ${item.resident.lastName}`
    : 'Sin residente'

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.85}
      style={{
        backgroundColor: '#1E293B',
        borderRadius: 18,
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: expanded ? urgency.border : '#334155',
        overflow: 'hidden',
      }}
    >
      {/* Main row */}
      <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {/* Unit badge */}
        <View style={{
          width: 52, height: 52, borderRadius: 14,
          backgroundColor: urgency.bg,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1, borderColor: urgency.border,
        }}>
          <Text style={{ color: urgency.text, fontWeight: '800', fontSize: 15 }}>
            {item.unitNumber}
          </Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{residentName}</Text>
          </View>
          <Text style={{ color: '#64748B', fontSize: 12 }}>
            {item.block ? `Bloque ${item.block}` : ''}{item.floor ? ` · Piso ${item.floor}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <View style={{ backgroundColor: urgency.bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: urgency.border }}>
              <Text style={{ color: urgency.text, fontSize: 10, fontWeight: '700' }}>{urgency.label}</Text>
            </View>
            <Text style={{ color: '#64748B', fontSize: 11 }}>
              {item.pendingCount} {item.pendingCount === 1 ? 'cuota' : 'cuotas'} · {item.monthsOverdue}m vencido
            </Text>
          </View>
        </View>

        {/* Amount + chevron */}
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ color: urgency.text, fontWeight: '800', fontSize: 16 }}>
            {formatMXN(item.totalDebt)}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16} color="#475569"
          />
        </View>
      </View>

      {/* Expanded detail */}
      {expanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: '#334155', padding: 16, gap: 10 }}>
          {/* Contact */}
          {item.resident?.email && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="mail-outline" size={14} color="#64748B" />
              <Text style={{ color: '#94A3B8', fontSize: 13 }}>{item.resident.email}</Text>
            </View>
          )}
          {item.resident?.phone && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="call-outline" size={14} color="#64748B" />
              <Text style={{ color: '#94A3B8', fontSize: 13 }}>{item.resident.phone}</Text>
            </View>
          )}

          {/* Payments breakdown */}
          <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 4 }}>
            CUOTAS PENDIENTES
          </Text>
          {item.payments.map((p) => (
            <View key={p.id} style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: '#0F172A', borderRadius: 10, padding: 12,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#CBD5E1', fontSize: 13 }} numberOfLines={1}>{p.description}</Text>
                {p.dueDate && (
                  <Text style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>
                    Vence: {new Date(p.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                )}
              </View>
              <Text style={{ color: '#F97316', fontWeight: '700', fontSize: 14, marginLeft: 12 }}>
                {formatMXN(p.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  )
}

// ── Screen ────────────────────────────────────────────────────

export default function ArrearsScreen() {
  const { data, isLoading, isFetching, refetch } = useArrears()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const arrears = data?.arrears ?? []
  const totalDebt = arrears.reduce((s, a) => s + a.totalDebt, 0)
  const critical = arrears.filter((a) => a.monthsOverdue >= 3).length

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Adeudos por unidad</Text>
          {data && (
            <Text style={{ color: '#64748B', fontSize: 13 }}>
              {data.total} {data.total === 1 ? 'unidad con adeudo' : 'unidades con adeudo'}
            </Text>
          )}
        </View>
      </View>

      {/* Summary cards */}
      {data && data.total > 0 && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: '#EF444415', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EF444430' }}>
            <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '600' }}>ADEUDO TOTAL</Text>
            <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 20, marginTop: 4 }}>
              {formatMXN(totalDebt)}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#F9731615', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F9731630' }}>
            <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '600' }}>CASOS CRÍTICOS</Text>
            <Text style={{ color: '#F97316', fontWeight: '800', fontSize: 20, marginTop: 4 }}>
              {critical} {critical === 1 ? 'unidad' : 'unidades'}
            </Text>
            <Text style={{ color: '#64748B', fontSize: 10, marginTop: 2 }}>3+ meses vencidos</Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      ) : (
        <FlatList
          data={arrears}
          keyExtractor={(item) => item.unitId}
          renderItem={({ item }) => (
            <ArrearCard
              item={item}
              expanded={expandedId === item.unitId}
              onToggle={() => setExpandedId(expandedId === item.unitId ? null : item.unitId)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor="#3B82F6" />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark-circle-outline" size={36} color="#22C55E" />
              </View>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>¡Sin adeudos!</Text>
              <Text style={{ color: '#64748B', fontSize: 14, textAlign: 'center' }}>
                Todas las unidades están al corriente con sus pagos.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
