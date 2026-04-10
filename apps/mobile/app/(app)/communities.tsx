import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
  Modal, Alert, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { useCommunities, useCreateCommunity } from '../../src/hooks/useCommunity'
import { useAuthStore } from '../../src/stores/auth.store'
import type { Community } from '../../src/services/community.service'

// ── Field component ───────────────────────────────────────────

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize, required }: {
  label: string; value: string; onChangeText: (v: string) => void
  placeholder?: string; keyboardType?: any; autoCapitalize?: any; required?: boolean
}) {
  return (
    <View style={{ marginBottom: 13 }}>
      <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 5 }}>
        {label}{required ? ' *' : ''}
      </Text>
      <TextInput
        value={value} onChangeText={onChangeText}
        placeholder={placeholder ?? ''} placeholderTextColor="#475569"
        keyboardType={keyboardType ?? 'default'} autoCapitalize={autoCapitalize ?? 'sentences'}
        style={{ backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: 'white', fontSize: 15 }}
      />
    </View>
  )
}

// ── New Community Modal ───────────────────────────────────────

function NewCommunityModal({ visible, onClose, onCreated }: {
  visible: boolean
  onClose: () => void
  onCreated: (community: Community) => void
}) {
  const { mutateAsync: createCommunity, isPending } = useCreateCommunity()
  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '',
    country: 'MX', zipCode: '', phone: '', email: '',
    timezone: 'America/Mexico_City', currency: 'MXN',
  })
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.name.trim() || !form.address.trim() || !form.city.trim() || !form.state.trim()) {
      return Alert.alert('Error', 'Nombre, dirección, ciudad y estado son requeridos')
    }
    try {
      const community = await createCommunity({
        name:     form.name.trim(),
        address:  form.address.trim(),
        city:     form.city.trim(),
        state:    form.state.trim(),
        country:  form.country || 'MX',
        zipCode:  form.zipCode || null,
        phone:    form.phone || null,
        email:    form.email || null,
        timezone: form.timezone || 'America/Mexico_City',
        currency: form.currency || 'MXN',
      })
      setForm({ name: '', address: '', city: '', state: '', country: 'MX', zipCode: '', phone: '', email: '', timezone: 'America/Mexico_City', currency: 'MXN' })
      onCreated(community)
      onClose()
      Alert.alert('Listo', `Comunidad "${community.name}" creada correctamente`)
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo crear la comunidad')
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Nueva comunidad</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#94A3B8" /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>

          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>INFORMACIÓN GENERAL</Text>
          <Field label="Nombre de la comunidad" value={form.name} onChangeText={set('name')} placeholder="Residencial Los Pinos" required />
          <Field label="Dirección" value={form.address} onChangeText={set('address')} placeholder="Av. Principal 123" required />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="Ciudad" value={form.city} onChangeText={set('city')} placeholder="CDMX" required /></View>
            <View style={{ flex: 1 }}><Field label="Estado" value={form.state} onChangeText={set('state')} placeholder="CDMX" required /></View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="País" value={form.country} onChangeText={set('country')} placeholder="MX" autoCapitalize="characters" /></View>
            <View style={{ flex: 1 }}><Field label="Código postal" value={form.zipCode} onChangeText={set('zipCode')} keyboardType="number-pad" placeholder="06600" /></View>
          </View>

          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginTop: 4 }}>CONTACTO</Text>
          <Field label="Teléfono" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoCapitalize="none" />
          <Field label="Correo electrónico" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />

          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginTop: 4 }}>CONFIGURACIÓN</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="Moneda" value={form.currency} onChangeText={set('currency')} placeholder="MXN" autoCapitalize="characters" /></View>
            <View style={{ flex: 1 }}><Field label="Zona horaria" value={form.timezone} onChangeText={set('timezone')} placeholder="America/Mexico_City" autoCapitalize="none" /></View>
          </View>
        </ScrollView>
        <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
          <TouchableOpacity onPress={handleSubmit} disabled={isPending}
            style={{ backgroundColor: '#3B82F6', borderRadius: 14, padding: 16, alignItems: 'center' }}>
            {isPending ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Crear comunidad</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

// ── Community Card ────────────────────────────────────────────

function CommunityCard({ community, isActive, onSelect }: {
  community: Community
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.75}
      style={{
        backgroundColor: isActive ? '#1E3A5F' : '#1E293B',
        borderRadius: 16, marginBottom: 10, padding: 16,
        borderWidth: 1.5,
        borderColor: isActive ? '#3B82F6' : '#334155',
        flexDirection: 'row', alignItems: 'center', gap: 14,
      }}
    >
      <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: isActive ? '#3B82F620' : '#0F172A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isActive ? '#3B82F640' : '#1E293B' }}>
        <Ionicons name="business-outline" size={22} color={isActive ? '#3B82F6' : '#64748B'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{community.name}</Text>
        <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{community.city}, {community.state}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 5 }}>
          <View style={{ backgroundColor: '#0F172A', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ color: '#94A3B8', fontSize: 10 }}>{community.totalUnits} unidades</Text>
          </View>
          <View style={{ backgroundColor: '#0F172A', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ color: '#94A3B8', fontSize: 10 }}>{community.currency}</Text>
          </View>
        </View>
      </View>
      {isActive && (
        <View style={{ backgroundColor: '#3B82F6', borderRadius: 20, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark" size={14} color="white" />
        </View>
      )}
    </TouchableOpacity>
  )
}

// ── Main Screen ───────────────────────────────────────────────

export default function CommunitiesScreen() {
  const user = useAuthStore((s) => s.user)
  const setCommunity = useAuthStore((s) => s.setCommunity)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const [showNew, setShowNew] = useState(false)
  const { data, isLoading, isRefetching, refetch } = useCommunities()
  const communities = data?.communities ?? []

  if (!isSuperAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Ionicons name="lock-closed-outline" size={48} color="#334155" />
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>Acceso restringido</Text>
        <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 8 }}>Solo los superadministradores pueden gestionar comunidades.</Text>
      </SafeAreaView>
    )
  }

  function handleSelect(community: Community) {
    Alert.alert(
      'Cambiar comunidad',
      `¿Trabajar en "${community.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Seleccionar',
          onPress: () => {
            setCommunity(community.id, 'COMMUNITY_ADMIN')
            Alert.alert('Comunidad activa', `Ahora estás gestionando: ${community.name}`)
            router.back()
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
          <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>Comunidades</Text>
          <Text style={{ color: '#64748B', fontSize: 12 }}>{communities.length} registradas</Text>
        </View>
        <TouchableOpacity onPress={() => setShowNew(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#3B82F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Ionicons name="add" size={18} color="white" />
          <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* Info banner */}
      <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: '#1E293B', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#334155' }}>
        <Ionicons name="information-circle-outline" size={18} color="#3B82F6" />
        <Text style={{ color: '#94A3B8', fontSize: 12, flex: 1 }}>
          Toca una comunidad para activarla. Todos los residentes, unidades y pagos quedan organizados por comunidad.
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      ) : (
        <FlatList
          data={communities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CommunityCard
              community={item}
              isActive={item.id === user?.communityId}
              onSelect={() => handleSelect(item)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3B82F6" />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <Ionicons name="business-outline" size={48} color="#334155" />
              <Text style={{ color: '#64748B', fontSize: 16, marginTop: 12 }}>Sin comunidades registradas</Text>
              <TouchableOpacity onPress={() => setShowNew(true)} style={{ marginTop: 16, backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
                <Text style={{ color: 'white', fontWeight: '600' }}>Crear primera comunidad</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <NewCommunityModal
        visible={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(community) => {
          setCommunity(community.id, 'COMMUNITY_ADMIN')
        }}
      />
    </SafeAreaView>
  )
}
