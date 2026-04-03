import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuthStore } from '../../../src/stores/auth.store'
import { useMe } from '../../../src/hooks/useAuth'

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMMUNITY_ADMIN: 'Administrador',
  RESIDENT: 'Residente',
  GUARD: 'Guardia',
  STAFF: 'Personal',
}

export default function DashboardScreen() {
  const { user } = useAuthStore()
  const { data: meData, isRefetching, refetch } = useMe()
  const role = user?.communityRole ?? user?.role ?? 'RESIDENT'
  const firstName = user?.firstName ?? 'Usuario'
  const initial = firstName[0]?.toUpperCase() ?? 'C'
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Buenos dias' : h < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3B82F6" />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <View>
            <Text style={{ color: '#64748B', fontSize: 14 }}>{greeting},</Text>
            <Text style={{ color: 'white', fontSize: 26, fontWeight: 'bold', marginTop: 2 }}>{firstName}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(app)/profile')}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>{initial}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Community card */}
        <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#334155' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '600' }}>COMUNIDAD ACTIVA</Text>
              <Text style={{ color: 'white', fontSize: 17, fontWeight: '600', marginTop: 4 }}>Residencial Chamanes</Text>
            </View>
            <View style={{ backgroundColor: '#3B82F615', borderColor: '#3B82F6', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '600' }}>{ROLE_LABEL[role] ?? role}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />
            <Text style={{ color: '#22C55E', fontSize: 13 }}>Sistema operativo</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 14 }}>Acciones rapidas</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          {role !== 'GUARD' && (
            <QuickAction icon="👥" label="Invitar visita" onPress={() => router.push('/(app)/(tabs)/visitors')} />
          )}
          {role !== 'GUARD' && (
            <QuickAction icon="💳" label="Pagar cuota" onPress={() => router.push('/(app)/(tabs)/payments')} />
          )}
          {role !== 'GUARD' && (
            <QuickAction icon="📅" label="Reservar area" onPress={() => router.push('/(app)/(tabs)/reservations')} />
          )}
          {role === 'GUARD' && (
            <QuickAction icon="📷" label="Escanear QR" onPress={() => router.push('/(app)/(tabs)/gate')} />
          )}
          <QuickAction icon="🔧" label="Reportar" onPress={() => {}} />
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <StatCard
            label={role === 'GUARD' ? 'Entradas hoy' : role === 'RESIDENT' ? 'Cuota actual' : 'Unidades'}
            value="—"
            icon={role === 'GUARD' ? '🔓' : role === 'RESIDENT' ? '💵' : '🏠'}
          />
          <StatCard
            label={role === 'GUARD' ? 'Salidas hoy' : role === 'RESIDENT' ? 'Visitas activas' : 'Residentes'}
            value="—"
            icon={role === 'GUARD' ? '🔒' : role === 'RESIDENT' ? '👥' : '👤'}
          />
        </View>

        <View style={{ backgroundColor: '#3B82F610', borderColor: '#3B82F630', borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 8 }}>
          <Text style={{ color: '#3B82F6', fontSize: 13 }}>Phase 2 completa — login real funcionando. Estadisticas en tiempo real en Phase 3+</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, minWidth: '44%', backgroundColor: '#1E293B', borderRadius: 18, padding: 18, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#334155' }}
    >
      <Text style={{ fontSize: 28 }}>{icon}</Text>
      <Text style={{ color: 'white', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
    </TouchableOpacity>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#334155' }}>
      <Text style={{ fontSize: 24, marginBottom: 8 }}>{icon}</Text>
      <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>{value}</Text>
      <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>{label}</Text>
    </View>
  )
}
