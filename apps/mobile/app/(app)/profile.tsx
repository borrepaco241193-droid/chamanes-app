import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, Modal, TextInput, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { useAuthStore } from '../../src/stores/auth.store'
import { useLogout, useChangePassword, useChangeEmail, useUploadAvatar, useUpdateProfile } from '../../src/hooks/useAuth'

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN:      'Super Admin',
  COMMUNITY_ADMIN:  'Administrador',
  MANAGER:          'Manager',
  RESIDENT:         'Residente',
  GUARD:            'Guardia',
  STAFF:            'Personal',
}

// ── Change Password Modal ─────────────────────────────────────

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { mutateAsync: changePassword, isPending } = useChangePassword()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)

  async function handleSubmit() {
    if (!form.current || !form.next || !form.confirm) {
      return Alert.alert('Error', 'Completa todos los campos')
    }
    if (form.next !== form.confirm) {
      return Alert.alert('Error', 'Las contraseñas nuevas no coinciden')
    }
    if (form.next.length < 8) {
      return Alert.alert('Error', 'La nueva contraseña debe tener al menos 8 caracteres')
    }
    if (!/[A-Z]/.test(form.next) || !/[0-9]/.test(form.next)) {
      return Alert.alert('Error', 'Debe contener al menos una mayúscula y un número')
    }
    try {
      await changePassword({ currentPassword: form.current, newPassword: form.next })
      setForm({ current: '', next: '', confirm: '' })
      onClose()
      Alert.alert('Listo', 'Contraseña actualizada correctamente.\nSe cerró sesión en otros dispositivos.')
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo cambiar la contraseña')
    }
  }

  function PwField({ label, value, show, onToggle, onChange }: {
    label: string; value: string; show: boolean
    onToggle: () => void; onChange: (v: string) => void
  }) {
    return (
      <View style={{ marginBottom: 14 }}>
        <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 12 }}>
          <TextInput
            value={value} onChangeText={onChange}
            secureTextEntry={!show} autoCapitalize="none"
            placeholderTextColor="#475569"
            style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 12, color: 'white', fontSize: 15 }}
          />
          <TouchableOpacity onPress={onToggle} style={{ paddingHorizontal: 14 }}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Cambiar contraseña</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#94A3B8" /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={{ backgroundColor: '#1E293B', borderRadius: 14, padding: 14, marginBottom: 20, flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: '#334155' }}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#3B82F6" />
            <Text style={{ color: '#94A3B8', fontSize: 13, flex: 1 }}>
              Al cambiar tu contraseña, se cerrará sesión en todos los demás dispositivos.
            </Text>
          </View>
          <PwField label="Contraseña actual" value={form.current} show={showCurrent} onToggle={() => setShowCurrent(v => !v)} onChange={v => setForm(f => ({ ...f, current: v }))} />
          <PwField label="Nueva contraseña" value={form.next} show={showNext} onToggle={() => setShowNext(v => !v)} onChange={v => setForm(f => ({ ...f, next: v }))} />
          <PwField label="Confirmar nueva contraseña" value={form.confirm} show={showNext} onToggle={() => setShowNext(v => !v)} onChange={v => setForm(f => ({ ...f, confirm: v }))} />
          <View style={{ backgroundColor: '#0F172A', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1E293B' }}>
            <Text style={{ color: '#475569', fontSize: 12 }}>Requisitos: mínimo 8 caracteres, una mayúscula y un número.</Text>
          </View>
        </ScrollView>
        <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
          <TouchableOpacity onPress={handleSubmit} disabled={isPending}
            style={{ backgroundColor: '#3B82F6', borderRadius: 14, padding: 16, alignItems: 'center' }}>
            {isPending ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Actualizar contraseña</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

// ── Edit Name Modal ───────────────────────────────────────────

function EditNameModal({ visible, onClose, currentFirst, currentLast }: {
  visible: boolean; onClose: () => void; currentFirst: string; currentLast: string
}) {
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile()
  const [form, setForm] = useState({ firstName: currentFirst, lastName: currentLast })

  async function handleSubmit() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      return Alert.alert('Error', 'Nombre y apellido son requeridos')
    }
    try {
      await updateProfile({ firstName: form.firstName.trim(), lastName: form.lastName.trim() })
      onClose()
      Alert.alert('Listo', 'Nombre actualizado correctamente.')
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo actualizar el nombre')
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Editar nombre</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#94A3B8" /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={{ marginBottom: 14 }}>
            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Nombre</Text>
            <TextInput
              value={form.firstName} onChangeText={v => setForm(f => ({ ...f, firstName: v }))}
              autoCapitalize="words" placeholderTextColor="#475569"
              style={{ backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: 'white', fontSize: 15 }}
            />
          </View>
          <View style={{ marginBottom: 14 }}>
            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Apellido</Text>
            <TextInput
              value={form.lastName} onChangeText={v => setForm(f => ({ ...f, lastName: v }))}
              autoCapitalize="words" placeholderTextColor="#475569"
              style={{ backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: 'white', fontSize: 15 }}
            />
          </View>
        </ScrollView>
        <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
          <TouchableOpacity onPress={handleSubmit} disabled={isPending}
            style={{ backgroundColor: '#3B82F6', borderRadius: 14, padding: 16, alignItems: 'center' }}>
            {isPending ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Guardar nombre</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

// ── Change Email Modal ────────────────────────────────────────

function ChangeEmailModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { mutateAsync: changeEmail, isPending } = useChangeEmail()
  const [form, setForm] = useState({ newEmail: '', currentPassword: '' })
  const [showPw, setShowPw] = useState(false)

  async function handleSubmit() {
    if (!form.newEmail || !form.currentPassword) {
      return Alert.alert('Error', 'Completa todos los campos')
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.newEmail)) {
      return Alert.alert('Error', 'Ingresa un correo válido')
    }
    try {
      await changeEmail({ newEmail: form.newEmail, currentPassword: form.currentPassword })
      setForm({ newEmail: '', currentPassword: '' })
      onClose()
      Alert.alert('Listo', 'Correo actualizado correctamente.')
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo cambiar el correo')
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Cambiar correo</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#94A3B8" /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={{ marginBottom: 14 }}>
            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Nuevo correo electrónico</Text>
            <TextInput
              value={form.newEmail} onChangeText={v => setForm(f => ({ ...f, newEmail: v }))}
              keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#475569"
              placeholder="nuevo@correo.com"
              style={{ backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: 'white', fontSize: 15 }}
            />
          </View>
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Contraseña actual</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 12 }}>
              <TextInput
                value={form.currentPassword} onChangeText={v => setForm(f => ({ ...f, currentPassword: v }))}
                secureTextEntry={!showPw} autoCapitalize="none" placeholderTextColor="#475569"
                style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 12, color: 'white', fontSize: 15 }}
              />
              <TouchableOpacity onPress={() => setShowPw(v => !v)} style={{ paddingHorizontal: 14 }}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
          <TouchableOpacity onPress={handleSubmit} disabled={isPending}
            style={{ backgroundColor: '#3B82F6', borderRadius: 14, padding: 16, alignItems: 'center' }}>
            {isPending ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Actualizar correo</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

// ── Main Screen ───────────────────────────────────────────────

export default function ProfileScreen() {
  const { user } = useAuthStore()
  const logout = useLogout()
  const uploadAvatar = useUploadAvatar()
  const [showChangePw, setShowChangePw] = useState(false)
  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [showEditName, setShowEditName] = useState(false)

  const role = user?.communityRole ?? user?.role ?? 'RESIDENT'
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Usuario'
  const initial = user?.firstName?.[0]?.toUpperCase() ?? 'C'

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })
    if (result.canceled) return
    const asset = result.assets[0]
    try {
      await uploadAvatar.mutateAsync({ imageUri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' })
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la foto de perfil')
    }
  }

  function handleLogout() {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que deseas cerrar sesión en este dispositivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout.mutate() },
      ],
    )
  }

  function handleSupport() {
    Alert.alert(
      'Soporte técnico',
      'Para asistencia escríbenos a:\nsoporte@chamanes.app\n\nHorario: Lunes a viernes 9am – 6pm (CST)',
      [{ text: 'Entendido' }],
    )
  }

  function handleNotifications() {
    router.push('/(app)/notifications')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Mi perfil</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <TouchableOpacity onPress={handlePickAvatar} style={{ marginBottom: 14 }} activeOpacity={0.8}>
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#3B82F640', overflow: 'hidden' }}>
              {user?.avatarUrl
                ? <Image source={{ uri: user.avatarUrl }} style={{ width: 88, height: 88 }} />
                : <Text style={{ color: '#3B82F6', fontWeight: 'bold', fontSize: 36 }}>{initial}</Text>
              }
            </View>
            <View style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0F172A' }}>
              {uploadAvatar.isPending
                ? <ActivityIndicator size="small" color="white" />
                : <Ionicons name="camera" size={13} color="white" />
              }
            </View>
          </TouchableOpacity>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>{fullName}</Text>
          <Text style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>{user?.email}</Text>
          <View style={{ backgroundColor: '#3B82F615', borderColor: '#3B82F640', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, marginTop: 10 }}>
            <Text style={{ color: '#3B82F6', fontWeight: '600', fontSize: 14 }}>{ROLE_LABEL[role] ?? role}</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={{ backgroundColor: '#1E293B', borderRadius: 20, borderWidth: 1, borderColor: '#334155', overflow: 'hidden', marginBottom: 16 }}>
          <InfoRow label="Correo" value={user?.email ?? '—'} icon="mail-outline" />
          <Divider />
          <InfoRow label="Rol" value={ROLE_LABEL[role] ?? role} icon="shield-outline" />
          <Divider />
          <InfoRow label="ID de cuenta" value={`${user?.id?.slice(0, 16)}…`} icon="finger-print-outline" />
        </View>

        {/* Actions card */}
        <View style={{ backgroundColor: '#1E293B', borderRadius: 20, borderWidth: 1, borderColor: '#334155', overflow: 'hidden', marginBottom: 20 }}>
          <MenuRow label="Editar nombre" icon="person-outline" color="#10B981" onPress={() => setShowEditName(true)} />
          <Divider />
          <MenuRow label="Cambiar contraseña" icon="lock-closed-outline" color="#3B82F6" onPress={() => setShowChangePw(true)} />
          <Divider />
          <MenuRow label="Cambiar correo" icon="mail-outline" color="#F59E0B" onPress={() => setShowChangeEmail(true)} />
          <Divider />
          <MenuRow label="Notificaciones" icon="notifications-outline" color="#8B5CF6" onPress={handleNotifications} />
          <Divider />
          <MenuRow label="Soporte técnico" icon="chatbubble-ellipses-outline" color="#10B981" onPress={handleSupport} />
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          disabled={logout.isPending}
          style={{ backgroundColor: '#EF444415', borderColor: '#EF444440', borderWidth: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
        >
          {logout.isPending
            ? <ActivityIndicator color="#EF4444" />
            : <>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 16 }}>Cerrar sesión</Text>
              </>
          }
        </TouchableOpacity>

        <Text style={{ color: '#334155', textAlign: 'center', fontSize: 12, marginTop: 24 }}>
          Chamanes v1.0.0 — Phase 2
        </Text>
      </ScrollView>

      <EditNameModal visible={showEditName} onClose={() => setShowEditName(false)} currentFirst={user?.firstName ?? ''} currentLast={user?.lastName ?? ''} />
      <ChangePasswordModal visible={showChangePw} onClose={() => setShowChangePw(false)} />
      <ChangeEmailModal visible={showChangeEmail} onClose={() => setShowChangeEmail(false)} />
    </SafeAreaView>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function InfoRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 12 }}>
      <Ionicons name={icon as any} size={18} color="#475569" />
      <Text style={{ color: '#64748B', fontSize: 14, flex: 1 }}>{label}</Text>
      <Text style={{ color: 'white', fontSize: 14, fontWeight: '500', maxWidth: '55%', textAlign: 'right' }} numberOfLines={1}>{value}</Text>
    </View>
  )
}

function MenuRow({ label, icon, color, badge, onPress }: {
  label: string; icon: string; color: string; badge?: string; onPress: () => void
}) {
  return (
    <TouchableOpacity onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 14 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={{ color: 'white', fontSize: 15, flex: 1 }}>{label}</Text>
      {badge && (
        <View style={{ backgroundColor: '#8B5CF620', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4 }}>
          <Text style={{ color: '#8B5CF6', fontSize: 11, fontWeight: '600' }}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color="#334155" />
    </TouchableOpacity>
  )
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#334155', marginHorizontal: 18 }} />
}
