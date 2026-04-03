import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuthStore } from '../../src/stores/auth.store'
import { useLogout } from '../../src/hooks/useAuth'

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMMUNITY_ADMIN: 'Administrador de Comunidad',
  RESIDENT: 'Residente',
  GUARD: 'Guardia de Seguridad',
  STAFF: 'Personal',
}

export default function ProfileScreen() {
  const { user } = useAuthStore()
  const logout = useLogout()

  const role = user?.communityRole ?? user?.role ?? 'RESIDENT'
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Usuario'
  const initial = user?.firstName?.[0]?.toUpperCase() ?? 'C'

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesion',
      'Seguro que deseas cerrar sesion en este dispositivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesion',
          style: 'destructive',
          onPress: () => logout.mutate(),
        },
      ],
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Text style={{ color: '#3B82F6', fontSize: 16 }}>← Regresar</Text>
        </TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Mi Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#2563EB', marginBottom: 14 }}>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 36 }}>{initial}</Text>
          </View>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>{fullName}</Text>
          <Text style={{ color: '#64748B', fontSize: 15, marginTop: 4 }}>{user?.email}</Text>
          <View style={{ backgroundColor: '#3B82F615', borderColor: '#3B82F6', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, marginTop: 10 }}>
            <Text style={{ color: '#3B82F6', fontWeight: '600', fontSize: 14 }}>{ROLE_LABEL[role] ?? role}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={{ backgroundColor: '#1E293B', borderRadius: 20, borderWidth: 1, borderColor: '#334155', overflow: 'hidden', marginBottom: 20 }}>
          <InfoRow label="Correo" value={user?.email ?? '—'} />
          <Divider />
          <InfoRow label="Rol" value={ROLE_LABEL[role] ?? role} />
          <Divider />
          <InfoRow label="ID de usuario" value={user?.id?.slice(0, 12) + '...' ?? '—'} />
        </View>

        {/* Settings section */}
        <View style={{ backgroundColor: '#1E293B', borderRadius: 20, borderWidth: 1, borderColor: '#334155', overflow: 'hidden', marginBottom: 24 }}>
          <MenuRow label="Cambiar contrasena" icon="🔒" onPress={() => {}} />
          <Divider />
          <MenuRow label="Notificaciones" icon="🔔" onPress={() => {}} />
          <Divider />
          <MenuRow label="Soporte" icon="💬" onPress={() => {}} />
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          disabled={logout.isPending}
          style={{ backgroundColor: '#EF444415', borderColor: '#EF4444', borderWidth: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
        >
          {logout.isPending
            ? <ActivityIndicator color="#EF4444" />
            : <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 16 }}>Cerrar sesion</Text>
          }
        </TouchableOpacity>

        <Text style={{ color: '#334155', textAlign: 'center', fontSize: 12, marginTop: 24 }}>
          Chamanes v1.0.0 — Phase 2
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 }}>
      <Text style={{ color: '#64748B', fontSize: 15 }}>{label}</Text>
      <Text style={{ color: 'white', fontSize: 15, fontWeight: '500', maxWidth: '60%', textAlign: 'right' }} numberOfLines={1}>{value}</Text>
    </View>
  )
}

function MenuRow({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
        <Text style={{ color: 'white', fontSize: 15 }}>{label}</Text>
      </View>
      <Text style={{ color: '#475569', fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  )
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#334155', marginHorizontal: 18 }} />
}
