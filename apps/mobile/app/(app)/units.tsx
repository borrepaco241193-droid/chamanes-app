import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Alert, Modal, ScrollView, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { useUnits, useCreateUnit } from '../../src/hooks/useResidents'
import { useAuthStore } from '../../src/stores/auth.store'
import { useDebounce } from '../../src/hooks/useDebounce'
import api from '../../src/lib/api'
import Constants from 'expo-constants'

// ── Helpers ───────────────────────────────────────────────────

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize }: {
  label: string; value: string; onChangeText: (v: string) => void
  placeholder?: string; keyboardType?: any; autoCapitalize?: any
}) {
  return (
    <View style={{ marginBottom: 13 }}>
      <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 5 }}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChangeText}
        placeholder={placeholder ?? ''} placeholderTextColor="#475569"
        keyboardType={keyboardType ?? 'default'} autoCapitalize={autoCapitalize ?? 'sentences'}
        style={{ backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: 'white', fontSize: 15 }}
      />
    </View>
  )
}

// ── Stat Card ─────────────────────────────────────────────────

function StatCard({ label, value, icon, color, sub }: {
  label: string; value: string | number; icon: string; color: string; sub?: string
}) {
  return (
    <View style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={{ color: 'white', fontSize: 26, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{label}</Text>
      {sub && <Text style={{ color: color, fontSize: 11, marginTop: 4, fontWeight: '600' }}>{sub}</Text>}
    </View>
  )
}

// ── New Unit Modal ────────────────────────────────────────────

function NewUnitModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { mutateAsync: createUnit, isPending } = useCreateUnit()
  const communityId = useAuthStore((s) => s.user?.communityId)
  const [form, setForm] = useState({
    number: '', block: '', floor: '', type: 'house', sqMeters: '',
    parkingSpots: '0', notes: '', ownerName: '', ownerPhone: '', ownerEmail: '',
  })
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.number.trim()) return Alert.alert('Error', 'El número de domicilio es requerido')
    if (!communityId) return Alert.alert('Error de sesión', 'No se detectó la comunidad activa. Cierra sesión y vuelve a entrar.')
    try {
      await createUnit({
        number: form.number.trim(), block: form.block || null,
        floor: form.floor ? parseInt(form.floor) : null, type: form.type,
        sqMeters: form.sqMeters ? parseFloat(form.sqMeters) : null,
        parkingSpots: parseInt(form.parkingSpots) || 0,
        notes: form.notes || null, ownerName: form.ownerName || null,
        ownerPhone: form.ownerPhone || null, ownerEmail: form.ownerEmail || null,
      })
      setForm({ number: '', block: '', floor: '', type: 'house', sqMeters: '', parkingSpots: '0', notes: '', ownerName: '', ownerPhone: '', ownerEmail: '' })
      onClose()
      Alert.alert('Listo', 'Domicilio registrado correctamente')
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo crear el domicilio')
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Nueva unidad</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#94A3B8" /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>DATOS DE LA UNIDAD</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="Número *" value={form.number} onChangeText={set('number')} placeholder="101, A-12" /></View>
            <View style={{ flex: 1 }}><Field label="Bloque / Manzana" value={form.block} onChangeText={set('block')} placeholder="A, Norte" /></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="Piso" value={form.floor} onChangeText={set('floor')} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Estacionamientos" value={form.parkingSpots} onChangeText={set('parkingSpots')} keyboardType="number-pad" /></View>
          </View>
          <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Tipo</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {[['house','Casa'],['apartment','Apto'],['villa','Villa'],['studio','Estudio'],['commercial','Comercial']].map(([k,v]) => (
              <TouchableOpacity key={k} onPress={() => setForm(f => ({ ...f, type: k }))}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
                  borderColor: form.type === k ? '#3B82F6' : '#334155',
                  backgroundColor: form.type === k ? '#3B82F620' : '#1E293B' }}>
                <Text style={{ color: form.type === k ? '#3B82F6' : '#94A3B8', fontSize: 13 }}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="m²" value={form.sqMeters} onChangeText={set('sqMeters')} keyboardType="decimal-pad" />
          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>PROPIETARIO (OPCIONAL)</Text>
          <Field label="Nombre" value={form.ownerName} onChangeText={set('ownerName')} />
          <Field label="Teléfono" value={form.ownerPhone} onChangeText={set('ownerPhone')} keyboardType="phone-pad" autoCapitalize="none" />
          <Field label="Correo" value={form.ownerEmail} onChangeText={set('ownerEmail')} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Notas internas" value={form.notes} onChangeText={set('notes')} />
        </ScrollView>
        <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
          <TouchableOpacity onPress={handleSubmit} disabled={isPending}
            style={{ backgroundColor: '#3B82F6', borderRadius: 14, padding: 16, alignItems: 'center' }}>
            {isPending ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Registrar unidad</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

// ── Unit Card ─────────────────────────────────────────────────

function UnitCard({ unit }: { unit: any }) {
  const occupied = unit.isOccupied
  const label = [unit.block ? `${unit.block}-` : '', unit.number].join('')
  const residentCount = unit._count?.residents ?? 0
  const vehicleCount = unit.vehicles?.length ?? 0
  const memberCount = unit.householdMembers?.length ?? 0

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/residents` as any)}
      activeOpacity={0.75}
      style={{
        backgroundColor: '#1E293B', borderRadius: 16, marginBottom: 10, padding: 16,
        borderWidth: 1, borderColor: occupied ? '#334155' : '#1E293B',
        borderLeftWidth: 4, borderLeftColor: occupied ? '#3B82F6' : '#334155',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: occupied ? '#3B82F620' : '#1E293B', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: occupied ? '#3B82F640' : '#334155' }}>
          <Ionicons name="home-outline" size={20} color={occupied ? '#3B82F6' : '#475569'} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>{label}</Text>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: occupied ? '#22C55E20' : '#64748B20' }}>
              <Text style={{ color: occupied ? '#22C55E' : '#64748B', fontSize: 11, fontWeight: '600' }}>
                {occupied ? 'Habitada' : 'Vacante'}
              </Text>
            </View>
          </View>
          <Text style={{ color: '#64748B', fontSize: 12, marginTop: 3 }}>
            {unit.type} {unit.floor ? `· Piso ${unit.floor}` : ''}
            {unit.sqMeters ? ` · ${unit.sqMeters}m²` : ''}
          </Text>
          {unit.ownerName && (
            <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 3 }}>
              Propietario: {unit.ownerName}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            {residentCount > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="person-outline" size={12} color="#94A3B8" />
                <Text style={{ color: '#94A3B8', fontSize: 11 }}>{residentCount} residente{residentCount > 1 ? 's' : ''}</Text>
              </View>
            )}
            {memberCount > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="people-outline" size={12} color="#94A3B8" />
                <Text style={{ color: '#94A3B8', fontSize: 11 }}>{memberCount} habitante{memberCount > 1 ? 's' : ''}</Text>
              </View>
            )}
            {vehicleCount > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="car-outline" size={12} color="#94A3B8" />
                <Text style={{ color: '#94A3B8', fontSize: 11 }}>{vehicleCount} vehículo{vehicleCount > 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#334155" />
      </View>
    </TouchableOpacity>
  )
}

// ── Main Screen ───────────────────────────────────────────────

export default function UnitsScreen() {
  const user = useAuthStore((s) => s.user)
  const communityId = user?.communityId
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [filterOccupied, setFilterOccupied] = useState<null | boolean>(null)
  const [showNew, setShowNew] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState(false)

  const { data, isLoading, isRefetching, refetch } = useUnits(true)
  const allUnits = data?.units ?? []
  const stats = data?.stats

  const filtered = allUnits.filter((u) => {
    const label = `${u.block ?? ''}${u.number}`.toLowerCase()
    const ownerMatch = (u.ownerName ?? '').toLowerCase().includes(debouncedSearch.toLowerCase())
    const textMatch = !debouncedSearch || label.includes(debouncedSearch.toLowerCase()) || ownerMatch
    const occupyMatch = filterOccupied === null || u.isOccupied === filterOccupied
    return textMatch && occupyMatch
  })

  async function handleDownloadReport() {
    if (!communityId) return Alert.alert('Error', 'No hay comunidad activa')
    setDownloadingReport(true)
    try {
      const API_URL =
        process.env.EXPO_PUBLIC_API_URL ??
        Constants.expoConfig?.extra?.apiUrl ??
        'http://192.168.1.76:3000'
      // Get auth token
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default
      const token = await AsyncStorage.getItem('access-token')
      const url = `${API_URL}/api/v1/communities/${communityId}/units/report`
      // Open in browser with auth (downloads the CSV)
      await Linking.openURL(`${url}?token=${token}`)
    } catch {
      Alert.alert('Error', 'No se pudo generar el reporte')
    } finally {
      setDownloadingReport(false)
    }
  }

  const occupancyPct = stats && stats.total > 0
    ? Math.round((stats.occupied / stats.total) * 100)
    : 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>Unidades</Text>
          {stats && <Text style={{ color: '#64748B', fontSize: 12 }}>{stats.total} registradas</Text>}
        </View>
        <TouchableOpacity onPress={handleDownloadReport} disabled={downloadingReport}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' }}>
          {downloadingReport
            ? <ActivityIndicator size="small" color="#94A3B8" />
            : <Ionicons name="download-outline" size={18} color="#94A3B8" />}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowNew(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#3B82F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Ionicons name="add" size={18} color="white" />
          <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>Nueva</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <UnitCard unit={item} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3B82F6" />}
        ListHeaderComponent={
          <>
            {/* Stats row */}
            {stats && (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <StatCard label="Total" value={stats.total} icon="home-outline" color="#3B82F6" />
                <StatCard label="Habitadas" value={stats.occupied} icon="checkmark-circle-outline" color="#22C55E" sub={`${occupancyPct}% ocupación`} />
                <StatCard label="Vacantes" value={stats.vacant} icon="ellipse-outline" color="#F59E0B" />
              </View>
            )}

            {/* Occupancy bar */}
            {stats && stats.total > 0 && (
              <View style={{ backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600' }}>Tasa de ocupación</Text>
                  <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>{occupancyPct}%</Text>
                </View>
                <View style={{ height: 8, backgroundColor: '#0F172A', borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ height: 8, backgroundColor: '#22C55E', borderRadius: 4, width: `${occupancyPct}%` }} />
                </View>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#22C55E' }} />
                    <Text style={{ color: '#64748B', fontSize: 11 }}>Habitadas ({stats.occupied})</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#334155' }} />
                    <Text style={{ color: '#64748B', fontSize: 11 }}>Vacantes ({stats.vacant})</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Report download banner */}
            <TouchableOpacity onPress={handleDownloadReport} disabled={downloadingReport}
              style={{ backgroundColor: '#1E293B', borderRadius: 14, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#334155' }}
              activeOpacity={0.75}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="document-text-outline" size={18} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Descargar reporte</Text>
                <Text style={{ color: '#64748B', fontSize: 12, marginTop: 1 }}>
                  CSV con todas las unidades, residentes y vehículos
                </Text>
              </View>
              {downloadingReport
                ? <ActivityIndicator size="small" color="#10B981" />
                : <Ionicons name="download-outline" size={18} color="#10B981" />}
            </TouchableOpacity>

            {/* Search + filter */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#334155' }}>
                <Ionicons name="search-outline" size={16} color="#64748B" />
                <TextInput value={search} onChangeText={setSearch} placeholder="Buscar unidad o propietario…"
                  placeholderTextColor="#475569" style={{ flex: 1, color: 'white', fontSize: 14 }}
                  autoCorrect={false} autoCapitalize="none" />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color="#475569" /></TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={() => setFilterOccupied(v => v === true ? null : true)}
                style={{ paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
                  borderColor: filterOccupied === true ? '#22C55E' : '#334155',
                  backgroundColor: filterOccupied === true ? '#22C55E20' : '#1E293B' }}>
                <Ionicons name="home" size={16} color={filterOccupied === true ? '#22C55E' : '#64748B'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFilterOccupied(v => v === false ? null : false)}
                style={{ paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
                  borderColor: filterOccupied === false ? '#F59E0B' : '#334155',
                  backgroundColor: filterOccupied === false ? '#F59E0B20' : '#1E293B' }}>
                <Ionicons name="home-outline" size={16} color={filterOccupied === false ? '#F59E0B' : '#64748B'} />
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <ActivityIndicator color="#3B82F6" size="large" />
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="home-outline" size={48} color="#334155" />
              <Text style={{ color: '#64748B', fontSize: 16, marginTop: 12 }}>
                {search || filterOccupied !== null ? 'Sin resultados' : 'Sin unidades registradas'}
              </Text>
              {!search && filterOccupied === null && (
                <TouchableOpacity onPress={() => setShowNew(true)}
                  style={{ marginTop: 16, backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
                  <Text style={{ color: 'white', fontWeight: '600' }}>Crear primera unidad</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />

      <NewUnitModal visible={showNew} onClose={() => { setShowNew(false); refetch() }} />
    </SafeAreaView>
  )
}
