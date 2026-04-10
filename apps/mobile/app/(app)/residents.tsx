import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { useResidents } from '../../src/hooks/useResidents'
import { useAuthStore } from '../../src/stores/auth.store'
import type { Resident } from '../../src/services/resident.service'
import { useDebounce } from '../../src/hooks/useDebounce'

const OCCUPANCY_LABEL = { OWNER: 'Propietario', TENANT: 'Inquilino' }
const OCCUPANCY_COLOR = { OWNER: '#3B82F6', TENANT: '#F59E0B' }

function ResidentCard({ resident }: { resident: Resident }) {
  const unit = resident.units[0]
  const unitLabel = unit
    ? `${unit.block ? `${unit.block}-` : ''}${unit.number}`
    : '—'
  const occupancy = unit?.occupancyType ?? 'OWNER'
  const initial = (resident.user.firstName[0] ?? '?').toUpperCase()
  const hasPending = (resident.pendingPayments ?? 0) > 0

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/resident/${resident.id}` as any)}
      style={{
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: hasPending ? '#F9731640' : '#334155',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
      activeOpacity={0.75}
    >
      {/* Avatar */}
      <View style={{
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: '#3B82F620',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#3B82F640',
      }}>
        <Text style={{ color: '#3B82F6', fontWeight: '700', fontSize: 18 }}>{initial}</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>
          {resident.user.firstName} {resident.user.lastName}
        </Text>
        <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
          Unidad {unitLabel}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <View style={{
            paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
            backgroundColor: `${OCCUPANCY_COLOR[occupancy]}20`,
          }}>
            <Text style={{ color: OCCUPANCY_COLOR[occupancy], fontSize: 10, fontWeight: '600' }}>
              {OCCUPANCY_LABEL[occupancy]}
            </Text>
          </View>
          {hasPending && (
            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F9731620' }}>
              <Text style={{ color: '#F97316', fontSize: 10, fontWeight: '600' }}>
                {resident.pendingPayments} pago{(resident.pendingPayments ?? 0) > 1 ? 's' : ''} pendiente{(resident.pendingPayments ?? 0) > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#475569" />
    </TouchableOpacity>
  )
}

function useIsAdmin() {
  const user = useAuthStore((s) => s.user)
  return (
    user?.role === 'SUPER_ADMIN' ||
    user?.communityRole === 'SUPER_ADMIN' ||
    user?.communityRole === 'COMMUNITY_ADMIN'
  )
}

export default function ResidentsScreen() {
  const isAdmin = useIsAdmin()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)

  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Ionicons name="lock-closed-outline" size={48} color="#334155" />
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>Acceso restringido</Text>
        <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 8 }}>Solo administradores pueden gestionar residentes.</Text>
      </SafeAreaView>
    )
  }

  const { data, isLoading, isRefetching, refetch } = useResidents(
    debouncedSearch ? { search: debouncedSearch } : undefined,
  )

  const residents = data?.residents ?? []

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>Residentes</Text>
          {data && (
            <Text style={{ color: '#64748B', fontSize: 12 }}>{data.total} en total</Text>
          )}
        </View>
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: '#1E293B', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
          borderWidth: 1, borderColor: '#334155',
        }}>
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre, email…"
            placeholderTextColor="#475569"
            style={{ flex: 1, color: 'white', fontSize: 15 }}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#475569" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      ) : (
        <FlatList
          data={residents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ResidentCard resident={item} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3B82F6" />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <Ionicons name="people-outline" size={48} color="#334155" />
              <Text style={{ color: '#64748B', fontSize: 16, marginTop: 12 }}>
                {search ? 'Sin resultados' : 'Sin residentes registrados'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
