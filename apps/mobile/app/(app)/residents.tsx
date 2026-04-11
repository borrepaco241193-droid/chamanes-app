import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
  Modal, Alert, ScrollView, Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { useResidents, useUnits, useCreateUnit, useCreateResident, useDeleteResident } from '../../src/hooks/useResidents'
import { useAuthStore } from '../../src/stores/auth.store'
import type { Resident, OccupancyType } from '../../src/services/resident.service'
import { useDebounce } from '../../src/hooks/useDebounce'

// ── Auth guard ────────────────────────────────────────────────

function useIsAdmin() {
  const user = useAuthStore((s) => s.user)
  return (
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'MANAGER' ||
    user?.role === 'COMMUNITY_ADMIN' ||
    user?.communityRole === 'SUPER_ADMIN' ||
    user?.communityRole === 'COMMUNITY_ADMIN' ||
    user?.communityRole === 'MANAGER'
  )
}

// ── Helpers ───────────────────────────────────────────────────

const OCCUPANCY_LABEL = { OWNER: 'Propietario', TENANT: 'Inquilino' }
const OCCUPANCY_COLOR = { OWNER: '#3B82F6', TENANT: '#F59E0B' }

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize, secureTextEntry }: {
  label: string; value: string; onChangeText: (v: string) => void
  placeholder?: string; keyboardType?: any; autoCapitalize?: any; secureTextEntry?: boolean
}) {
  return (
    <View style={{ marginBottom: 13 }}>
      <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 5 }}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChangeText}
        placeholder={placeholder ?? ''} placeholderTextColor="#475569"
        keyboardType={keyboardType ?? 'default'} autoCapitalize={autoCapitalize ?? 'sentences'}
        secureTextEntry={secureTextEntry}
        style={{ backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: 'white', fontSize: 15 }}
      />
    </View>
  )
}

// ── New Unit Modal ────────────────────────────────────────────

function NewUnitModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { mutateAsync: createUnit, isPending } = useCreateUnit()
  const [form, setForm] = useState({ number: '', block: '', floor: '', type: 'house', sqMeters: '', parkingSpots: '0', notes: '', ownerName: '', ownerPhone: '', ownerEmail: '' })
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const communityId = useAuthStore((s) => s.user?.communityId)

  async function handleSubmit() {
    if (!form.number.trim()) return Alert.alert('Error', 'El número de domicilio es requerido')
    if (!communityId) return Alert.alert('Error de sesión', 'No se detectó la comunidad activa. Cierra sesión y vuelve a entrar.')
    try {
      await createUnit({
        number:       form.number.trim(),
        block:        form.block || null,
        floor:        form.floor ? parseInt(form.floor) : null,
        type:         form.type,
        sqMeters:     form.sqMeters ? parseFloat(form.sqMeters) : null,
        parkingSpots: parseInt(form.parkingSpots) || 0,
        notes:        form.notes || null,
        ownerName:    form.ownerName || null,
        ownerPhone:   form.ownerPhone || null,
        ownerEmail:   form.ownerEmail || null,
      })
      onClose()
      setForm({ number: '', block: '', floor: '', type: 'house', sqMeters: '', parkingSpots: '0', notes: '', ownerName: '', ownerPhone: '', ownerEmail: '' })
      Alert.alert('Listo', 'Domicilio registrado correctamente')
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo crear el domicilio')
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Nuevo domicilio</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#94A3B8" /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>DATOS DEL DOMICILIO</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="Número / ID *" value={form.number} onChangeText={set('number')} placeholder="101, Casa 5, A-12" /></View>
            <View style={{ flex: 1 }}><Field label="Manzana / Bloque" value={form.block} onChangeText={set('block')} placeholder="A, B, Norte" /></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="Piso" value={form.floor} onChangeText={set('floor')} keyboardType="number-pad" placeholder="1" /></View>
            <View style={{ flex: 1 }}><Field label="Lugares de estac." value={form.parkingSpots} onChangeText={set('parkingSpots')} keyboardType="number-pad" placeholder="1" /></View>
          </View>
          <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Tipo de inmueble</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {[['house', 'Casa'], ['apartment', 'Apartamento'], ['villa', 'Villa'], ['studio', 'Estudio'], ['commercial', 'Comercial']].map(([k, v]) => (
              <TouchableOpacity key={k} onPress={() => setForm(f => ({ ...f, type: k }))}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
                  borderColor: form.type === k ? '#3B82F6' : '#334155',
                  backgroundColor: form.type === k ? '#3B82F620' : '#1E293B' }}>
                <Text style={{ color: form.type === k ? '#3B82F6' : '#94A3B8', fontSize: 13 }}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="m²" value={form.sqMeters} onChangeText={set('sqMeters')} keyboardType="decimal-pad" placeholder="120" />
          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginTop: 4 }}>DATOS DEL PROPIETARIO (OPCIONAL)</Text>
          <Field label="Nombre del propietario" value={form.ownerName} onChangeText={set('ownerName')} />
          <Field label="Teléfono" value={form.ownerPhone} onChangeText={set('ownerPhone')} keyboardType="phone-pad" autoCapitalize="none" />
          <Field label="Correo" value={form.ownerEmail} onChangeText={set('ownerEmail')} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Notas internas" value={form.notes} onChangeText={set('notes')} />
        </ScrollView>
        <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
          <TouchableOpacity onPress={handleSubmit} disabled={isPending}
            style={{ backgroundColor: '#3B82F6', borderRadius: 14, padding: 16, alignItems: 'center' }}>
            {isPending ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Registrar domicilio</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

// ── New Resident Modal ────────────────────────────────────────

function NewResidentModal({ visible, onClose, units }: { visible: boolean; onClose: () => void; units: { id: string; number: string; block?: string | null }[] }) {
  const { mutateAsync: createResident, isPending } = useCreateResident()
  const communityId = useAuthStore((s) => s.user?.communityId)
  const currentUser = useAuthStore((s) => s.user)
  const isTopAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.communityRole === 'SUPER_ADMIN' ||
    currentUser?.communityRole === 'COMMUNITY_ADMIN'
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '',
    role: 'RESIDENT', unitId: '', occupancyType: 'OWNER' as OccupancyType,
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
  })
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      return Alert.alert('Error', 'Nombre, apellido y correo son requeridos')
    }
    if (!communityId) return Alert.alert('Error de sesión', 'No se detectó la comunidad activa. Cierra sesión y vuelve a entrar.')
    try {
      const result = await createResident({
        firstName:    form.firstName.trim(),
        lastName:     form.lastName.trim(),
        email:        form.email.trim().toLowerCase(),
        phone:        form.phone || null,
        password:     form.password || undefined,
        role:         form.role,
        unitId:       form.unitId || null,
        occupancyType: form.occupancyType,
        isPrimary:    true,
        emergencyContactName:     form.emergencyContactName || null,
        emergencyContactPhone:    form.emergencyContactPhone || null,
        emergencyContactRelation: form.emergencyContactRelation || null,
      })
      onClose()
      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'RESIDENT', unitId: '', occupancyType: 'OWNER', emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '' })
      if (result?.tempPassword) {
        Alert.alert(
          'Residente registrado',
          `Contraseña temporal generada:\n\n${result.tempPassword}\n\nCompártela con el residente y pídele que la cambie al iniciar sesión.`,
        )
      } else {
        Alert.alert('Listo', 'Residente registrado. Ya puede iniciar sesión.')
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo registrar el residente')
    }
  }

  const ALL_ROLES: [string, string][] = [
    ['RESIDENT',        'Residente'],
    ['COMMUNITY_ADMIN', 'Administrador'],
    ['MANAGER',         'Manager'],
    ['GUARD',           'Guardia'],
    ['STAFF',           'Técnico'],
  ]
  const ROLES = isTopAdmin
    ? ALL_ROLES
    : ALL_ROLES.filter(([k]) => k !== 'COMMUNITY_ADMIN' && k !== 'MANAGER')

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Nuevo usuario</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#94A3B8" /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>

          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>DATOS PERSONALES</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="Nombre *" value={form.firstName} onChangeText={set('firstName')} /></View>
            <View style={{ flex: 1 }}><Field label="Apellido *" value={form.lastName} onChangeText={set('lastName')} /></View>
          </View>
          <Field label="Correo electrónico *" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Teléfono" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoCapitalize="none" />
          <Field label="Contraseña (dejar vacío para auto-generar)" value={form.password} onChangeText={set('password')} secureTextEntry placeholder="Mínimo 8 caracteres" autoCapitalize="none" />

          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginTop: 4 }}>ROL EN LA COMUNIDAD</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {ROLES.map(([k, v]) => (
              <TouchableOpacity key={k} onPress={() => setForm(f => ({ ...f, role: k }))}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
                  borderColor: form.role === k ? '#3B82F6' : '#334155',
                  backgroundColor: form.role === k ? '#3B82F620' : '#1E293B' }}>
                <Text style={{ color: form.role === k ? '#3B82F6' : '#94A3B8', fontSize: 13 }}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>ASIGNAR DOMICILIO</Text>
          <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Domicilio</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => setForm(f => ({ ...f, unitId: '' }))}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
                  borderColor: form.unitId === '' ? '#3B82F6' : '#334155',
                  backgroundColor: form.unitId === '' ? '#3B82F620' : '#1E293B' }}>
                <Text style={{ color: form.unitId === '' ? '#3B82F6' : '#94A3B8', fontSize: 13 }}>Sin asignar</Text>
              </TouchableOpacity>
              {units.map((u) => (
                <TouchableOpacity key={u.id} onPress={() => setForm(f => ({ ...f, unitId: u.id }))}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
                    borderColor: form.unitId === u.id ? '#3B82F6' : '#334155',
                    backgroundColor: form.unitId === u.id ? '#3B82F620' : '#1E293B' }}>
                  <Text style={{ color: form.unitId === u.id ? '#3B82F6' : '#94A3B8', fontSize: 13 }}>
                    {u.block ? `${u.block}-` : ''}{u.number}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {form.unitId && (
            <>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Tipo de ocupación</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                {(['OWNER', 'TENANT'] as OccupancyType[]).map((t) => (
                  <TouchableOpacity key={t} onPress={() => setForm(f => ({ ...f, occupancyType: t }))}
                    style={{ flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1, alignItems: 'center',
                      borderColor: form.occupancyType === t ? '#3B82F6' : '#334155',
                      backgroundColor: form.occupancyType === t ? '#3B82F620' : '#1E293B' }}>
                    <Text style={{ color: form.occupancyType === t ? '#3B82F6' : '#94A3B8', fontWeight: '600' }}>
                      {t === 'OWNER' ? 'Propietario' : 'Inquilino'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>CONTACTO DE EMERGENCIA</Text>
          <Field label="Nombre" value={form.emergencyContactName} onChangeText={set('emergencyContactName')} />
          <Field label="Teléfono" value={form.emergencyContactPhone} onChangeText={set('emergencyContactPhone')} keyboardType="phone-pad" autoCapitalize="none" />
          <Field label="Parentesco" value={form.emergencyContactRelation} onChangeText={set('emergencyContactRelation')} placeholder="Mamá, Hermano, etc." />
        </ScrollView>
        <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
          <TouchableOpacity onPress={handleSubmit} disabled={isPending}
            style={{ backgroundColor: '#3B82F6', borderRadius: 14, padding: 16, alignItems: 'center' }}>
            {isPending ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Registrar usuario</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

// ── Resident Card ─────────────────────────────────────────────

function ResidentCard({ resident, onDelete }: { resident: Resident; onDelete: (r: Resident) => void }) {
  const communityId = useAuthStore((s) => s.user?.communityId ?? '')
  const unit = resident.units[0]
  const unitLabel = unit ? `${unit.block ? `${unit.block}-` : ''}${unit.number}` : '—'
  const occupancy = unit?.occupancyType ?? 'OWNER'
  const initial = (resident.user.firstName[0] ?? '?').toUpperCase()
  const hasPending = (resident.pendingPayments ?? 0) > 0

  return (
    <View style={{ backgroundColor: '#1E293B', borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: hasPending ? '#F9731640' : '#334155', overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={() => router.push(`/(app)/resident/${resident.id}?cid=${communityId}` as any)}
        style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        activeOpacity={0.75}
      >
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3B82F640' }}>
          <Text style={{ color: '#3B82F6', fontWeight: '700', fontSize: 18 }}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>{resident.user.firstName} {resident.user.lastName}</Text>
          <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>Unidad {unitLabel}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: `${OCCUPANCY_COLOR[occupancy]}20` }}>
              <Text style={{ color: OCCUPANCY_COLOR[occupancy], fontSize: 10, fontWeight: '600' }}>{OCCUPANCY_LABEL[occupancy]}</Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={() => onDelete(resident)} style={{ padding: 6 }}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={18} color="#475569" />
        </View>
      </TouchableOpacity>
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────

export default function ResidentsScreen() {
  const isAdmin = useIsAdmin()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [showNewUnit, setShowNewUnit] = useState(false)
  const [showNewResident, setShowNewResident] = useState(false)
  const { mutateAsync: deleteResident } = useDeleteResident()

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
  const { data: unitsData, refetch: refetchUnits } = useUnits()
  const residents = data?.residents ?? []
  const units = unitsData?.units ?? []

  function confirmDelete(resident: Resident) {
    Alert.alert(
      'Dar de baja residente',
      `¿Dar de baja a ${resident.user.firstName} ${resident.user.lastName}? Esta acción desvincula al residente de la comunidad.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Dar de baja',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteResident(resident.id)
              refetch()
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo dar de baja')
            }
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>Residentes</Text>
          {data && <Text style={{ color: '#64748B', fontSize: 12 }}>{data.total} en total</Text>}
        </View>
        {/* Action buttons */}
        <TouchableOpacity onPress={() => setShowNewUnit(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1E293B', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#334155' }}>
          <Ionicons name="home-outline" size={16} color="#94A3B8" />
          <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600' }}>+ Domicilio</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowNewResident(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#3B82F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Ionicons name="person-add-outline" size={16} color="white" />
          <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>+ Residente</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1E293B', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#334155' }}>
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Buscar por nombre, email…" placeholderTextColor="#475569"
            style={{ flex: 1, color: 'white', fontSize: 15 }} autoCorrect={false} autoCapitalize="none" />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color="#475569" /></TouchableOpacity>
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
          renderItem={({ item }) => <ResidentCard resident={item} onDelete={confirmDelete} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3B82F6" />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <Ionicons name="people-outline" size={48} color="#334155" />
              <Text style={{ color: '#64748B', fontSize: 16, marginTop: 12 }}>
                {search ? 'Sin resultados' : 'Sin residentes registrados'}
              </Text>
              {!search && (
                <TouchableOpacity onPress={() => setShowNewResident(true)} style={{ marginTop: 16, backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
                  <Text style={{ color: 'white', fontWeight: '600' }}>Registrar primer residente</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      <NewUnitModal visible={showNewUnit} onClose={() => { setShowNewUnit(false); refetch(); refetchUnits() }} />
      <NewResidentModal visible={showNewResident} onClose={() => { setShowNewResident(false); refetch() }} units={units} />
    </SafeAreaView>
  )
}
