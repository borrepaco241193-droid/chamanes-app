import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
  Modal, Alert, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState, useEffect } from 'react'
import {
  useCommunities, useCreateCommunity,
  useCommunityMembers, useAssignCommunityMember, useRemoveCommunityMember,
} from '../../src/hooks/useCommunity'
import { useAuthStore } from '../../src/stores/auth.store'
import { authService } from '../../src/services/auth.service'
import api from '../../src/lib/api'
import type { Community, CommunityMember } from '../../src/services/community.service'

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
      // Launch guided onboarding for the new community
      router.push({
        pathname: '/(app)/onboarding',
        params: { communityId: community.id, communityName: encodeURIComponent(community.name) },
      } as any)
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

// ── Community Detail Modal (managers + assign) ────────────────

const ROLE_LABEL: Record<string, string> = { COMMUNITY_ADMIN: 'Administrador', MANAGER: 'Manager' }
const ROLE_COLOR: Record<string, string> = { COMMUNITY_ADMIN: '#8B5CF6', MANAGER: '#3B82F6' }

function CommunityDetailModal({ community, visible, onClose }: {
  community: Community | null
  visible: boolean
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'COMMUNITY_ADMIN' | 'MANAGER'>('MANAGER')

  const { data, isLoading, refetch } = useCommunityMembers(community?.id)
  const { mutateAsync: assignMember, isPending: isAssigning } = useAssignCommunityMember(community?.id ?? '')
  const { mutateAsync: removeMember } = useRemoveCommunityMember(community?.id ?? '')

  const members = data?.members ?? []

  async function handleAssign() {
    if (!email.trim()) return Alert.alert('Error', 'Ingresa el correo del usuario')
    try {
      const res = await assignMember({ email: email.trim().toLowerCase(), role })
      setEmail('')
      Alert.alert('Asignado', `${res.firstName} ${res.lastName} ahora es ${ROLE_LABEL[role]} de ${community?.name}`)
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo asignar el usuario')
    }
  }

  function handleRemove(member: CommunityMember) {
    Alert.alert(
      'Remover acceso',
      `¿Remover a ${member.user.firstName} ${member.user.lastName} de ${community?.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover', style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(member.userId)
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo remover')
            }
          },
        },
      ],
    )
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }} numberOfLines={1}>{community?.name}</Text>
            <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{community?.city}, {community?.state} · {community?.totalUnits} unidades</Text>
          </View>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#94A3B8" /></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
            {[
              { icon: 'home-outline', color: '#3B82F6', label: 'Unidades', val: community?.totalUnits ?? 0 },
              { icon: 'cash-outline', color: '#10B981', label: 'Moneda', val: community?.currency ?? '' },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155' }}>
                <Ionicons name={s.icon as any} size={18} color={s.color} />
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginTop: 8 }}>{s.val}</Text>
                <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Assign section */}
          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>ASIGNAR ADMINISTRADOR / MANAGER</Text>
          <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Rol a asignar</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {(['COMMUNITY_ADMIN', 'MANAGER'] as const).map((r) => (
              <TouchableOpacity key={r} onPress={() => setRole(r)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center',
                  borderColor: role === r ? ROLE_COLOR[r] : '#334155',
                  backgroundColor: role === r ? `${ROLE_COLOR[r]}20` : '#1E293B' }}>
                <Text style={{ color: role === r ? ROLE_COLOR[r] : '#94A3B8', fontWeight: '600', fontSize: 13 }}>
                  {ROLE_LABEL[r]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
            <TextInput
              value={email} onChangeText={setEmail}
              placeholder="correo@ejemplo.com" placeholderTextColor="#475569"
              keyboardType="email-address" autoCapitalize="none"
              style={{ flex: 1, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: 'white', fontSize: 15 }}
            />
            <TouchableOpacity onPress={handleAssign} disabled={isAssigning}
              style={{ backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' }}>
              {isAssigning
                ? <ActivityIndicator color="white" size="small" />
                : <Ionicons name="person-add-outline" size={20} color="white" />}
            </TouchableOpacity>
          </View>

          {/* Members list */}
          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>
            ADMINISTRADORES ASIGNADOS {members.length > 0 ? `(${members.length})` : ''}
          </Text>

          {isLoading ? (
            <ActivityIndicator color="#3B82F6" style={{ marginVertical: 24 }} />
          ) : members.length === 0 ? (
            <View style={{ backgroundColor: '#1E293B', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155', marginBottom: 16 }}>
              <Ionicons name="people-outline" size={32} color="#334155" />
              <Text style={{ color: '#64748B', fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                Sin administradores asignados.{'\n'}Ingresa el correo de un usuario registrado para asignarle acceso.
              </Text>
            </View>
          ) : (
            members.map((m) => (
              <View key={m.communityUserId} style={{ backgroundColor: '#1E293B', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderWidth: 1, borderColor: '#334155' }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: `${ROLE_COLOR[m.role]}20`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${ROLE_COLOR[m.role]}40` }}>
                  <Text style={{ color: ROLE_COLOR[m.role], fontWeight: '700', fontSize: 16 }}>
                    {m.user.firstName[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>{m.user.firstName} {m.user.lastName}</Text>
                  <Text style={{ color: '#64748B', fontSize: 12, marginTop: 1 }}>{m.user.email}</Text>
                  <View style={{ marginTop: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: `${ROLE_COLOR[m.role]}20` }}>
                    <Text style={{ color: ROLE_COLOR[m.role], fontSize: 10, fontWeight: '700' }}>{ROLE_LABEL[m.role]}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleRemove(m)} style={{ padding: 6 }}>
                  <Ionicons name="person-remove-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

// ── Community Card ────────────────────────────────────────────

function CommunityCard({ community, isActive, onSelect, onManage }: {
  community: Community
  isActive: boolean
  onSelect: () => void
  onManage: () => void
}) {
  return (
    <View style={{
      backgroundColor: isActive ? '#1E3A5F' : '#1E293B',
      borderRadius: 16, marginBottom: 10,
      borderWidth: 1.5,
      borderColor: isActive ? '#3B82F6' : '#334155',
    }}>
      {/* Main tap → select */}
      <TouchableOpacity onPress={onSelect} activeOpacity={0.75}
        style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
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

      {/* Manage admins button */}
      <TouchableOpacity onPress={onManage} activeOpacity={0.75}
        style={{ borderTopWidth: 1, borderTopColor: '#334155', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="people-outline" size={15} color="#3B82F6" />
        <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '600', flex: 1 }}>Gestionar administradores</Text>
        <Ionicons name="chevron-forward" size={14} color="#475569" />
      </TouchableOpacity>
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────

export default function CommunitiesScreen() {
  const user = useAuthStore((s) => s.user)
  const setCommunity = useAuthStore((s) => s.setCommunity)
  const setAuth = useAuthStore((s) => s.setAuth)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isCommunityAdmin = user?.role === 'COMMUNITY_ADMIN' || user?.role === 'MANAGER' || user?.communityRole === 'COMMUNITY_ADMIN' || user?.communityRole === 'MANAGER'
  // True when arriving here because no community is selected yet (first access)
  const isFirstSelect = isSuperAdmin && !user?.communityId

  const [showNew, setShowNew] = useState(false)
  const [managingCommunity, setManagingCommunity] = useState<Community | null>(null)
  const [isClaiming, setIsClaiming] = useState(false)

  const { data, isLoading, isRefetching, refetch } = useCommunities()
  const setUser = useAuthStore((s) => s.setUser)

  async function handleClaimSuperAdmin() {
    setIsClaiming(true)
    try {
      const res = await api.post('/auth/claim-super-admin')
      const { user: newUser, accessToken, refreshToken } = res.data
      setAuth(newUser, { accessToken, refreshToken })
      refetch()
      Alert.alert('¡Listo!', 'Ahora tienes acceso de Super Admin. Verás todas las comunidades.')
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo reclamar el acceso')
    } finally {
      setIsClaiming(false)
    }
  }

  // On mount: call /auth/me directly (bypassing React Query cache) to always get
  // the freshest community list — critical when user is added to a new community
  useEffect(() => {
    authService.getMe().then((result: any) => {
      if (result && Array.isArray(result.communities) && result.communities.length > 0 && user) {
        setUser({ ...user, communities: result.communities })
      }
    }).catch(() => {})
    refetch()
  }, [])

  // Build communities list:
  // Merge /communities API (SUPER_ADMIN) + /auth/me communities (all roles) + auth store cache.
  const apiCommunities: Community[] = data?.communities ?? []
  const authStoreList: Community[] = (user?.communities ?? []).map((c) => ({
    id: c.id, name: c.name, city: '', state: '', country: '', address: '',
    phone: null, email: null, logoUrl: (c as any).logoUrl ?? null, timezone: '',
    currency: '', totalUnits: 0, isActive: true, settings: {} as any,
  }))

  // Merge: auth store fills gap immediately; API enriches when ready
  const mergedMap = new Map<string, Community>()
  authStoreList.forEach((c) => mergedMap.set(c.id, c))
  apiCommunities.forEach((c) => mergedMap.set(c.id, c))
  const communities: Community[] = Array.from(mergedMap.values())

  // Allow access if SUPER_ADMIN, or if any data source shows >1 community
  const effectiveCount = Math.max(communities.length, authStoreList.length, apiCommunities.length)
  const canAccessCommunities = isSuperAdmin || effectiveCount > 1

  if (!canAccessCommunities && !isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Ionicons name="shield-outline" size={48} color={isCommunityAdmin ? '#8B5CF6' : '#334155'} />
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>
          {isCommunityAdmin ? 'Acceso de Super Admin' : 'Acceso restringido'}
        </Text>
        <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
          {isCommunityAdmin
            ? 'Eres administrador de comunidad. Si eres el primer administrador del sistema, puedes reclamar acceso completo.'
            : 'No tienes múltiples comunidades asignadas.'}
        </Text>
        {isCommunityAdmin && (
          <TouchableOpacity
            onPress={handleClaimSuperAdmin}
            disabled={isClaiming}
            style={{ marginTop: 24, backgroundColor: '#8B5CF6', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 }}
          >
            {isClaiming
              ? <ActivityIndicator color="white" />
              : <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Reclamar acceso de Super Admin</Text>
            }
          </TouchableOpacity>
        )}
        <Text style={{ color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
          {isCommunityAdmin ? 'Solo funciona si no existe ningún Super Admin en el sistema.' : ''}
        </Text>
      </SafeAreaView>
    )
  }

  function handleSelect(community: Community) {
    if (isFirstSelect) {
      // First login — select immediately without confirmation
      setCommunity(community.id, 'COMMUNITY_ADMIN')
      router.replace('/(app)/(tabs)/')
      return
    }
    Alert.alert(
      'Cambiar comunidad',
      `¿Trabajar en "${community.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Seleccionar',
          onPress: () => {
            setCommunity(community.id, 'COMMUNITY_ADMIN')
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
        {!isFirstSelect && (
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>Comunidades</Text>
          <Text style={{ color: '#64748B', fontSize: 12 }}>{communities.length} registradas</Text>
        </View>
        {isSuperAdmin && (
          <TouchableOpacity onPress={() => setShowNew(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#3B82F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Ionicons name="add" size={18} color="white" />
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>Nueva</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info banner */}
      <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: isFirstSelect ? '#1E3A5F' : '#1E293B', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: isFirstSelect ? '#3B82F6' : '#334155' }}>
        <Ionicons name={isFirstSelect ? 'business-outline' : 'information-circle-outline'} size={18} color="#3B82F6" />
        <Text style={{ color: '#94A3B8', fontSize: 12, flex: 1 }}>
          {isFirstSelect
            ? 'Selecciona el complejo que vas a gestionar para continuar.'
            : 'Toca una comunidad para activarla. Usa "Gestionar administradores" para asignar managers y admins.'}
        </Text>
      </View>

      {isLoading && communities.length === 0 ? (
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
              onManage={() => setManagingCommunity(item)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching || isLoading} onRefresh={refetch} tintColor="#3B82F6" />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <Ionicons name="business-outline" size={48} color="#334155" />
              <Text style={{ color: '#64748B', fontSize: 16, marginTop: 12 }}>Sin comunidades registradas</Text>
              {isSuperAdmin && (
                <TouchableOpacity onPress={() => setShowNew(true)} style={{ marginTop: 16, backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
                  <Text style={{ color: 'white', fontWeight: '600' }}>Crear primera comunidad</Text>
                </TouchableOpacity>
              )}
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

      <CommunityDetailModal
        visible={!!managingCommunity}
        community={managingCommunity}
        onClose={() => setManagingCommunity(null)}
      />
    </SafeAreaView>
  )
}
