import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuthStore } from '../../../src/stores/auth.store'
import { useMe } from '../../../src/hooks/useAuth'
import { useHasPendingPayments } from '../../../src/hooks/usePayments'
import { gateService } from '../../../src/services/gate.service'
import { Ionicons } from '@expo/vector-icons'
import { useRef, useState } from 'react'
import * as Haptics from 'expo-haptics'

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN:     'Super Admin',
  COMMUNITY_ADMIN: 'Administrador',
  MANAGER:         'Manager',
  RESIDENT:        'Residente',
  GUARD:           'Guardia',
  STAFF:           'Personal',
}

// ── Gate Button ───────────────────────────────────────────────
type GateButtonProps = {
  type: 'entry' | 'exit'
  communityId: string
  locked?: boolean
}

function GateButton({ type, communityId, locked = false }: GateButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const scale = useRef(new Animated.Value(1)).current

  const isEntry = type === 'entry'
  const color = isEntry ? '#22C55E' : '#F97316'
  const darkColor = isEntry ? '#15803D' : '#C2410C'
  const icon = isEntry ? 'enter' : 'exit'
  const label = isEntry ? 'Abrir entrada' : 'Abrir salida'
  const successMsg = isEntry ? '¡Puerta de entrada abierta!' : '¡Puerta de salida abierta!'

  async function handlePress() {
    if (status === 'loading' || locked) return
    if (locked) {
      Alert.alert('Acceso restringido', 'Tienes pagos pendientes. Realiza tu pago para usar esta función.')
      return
    }

    // Scale animation feedback
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start()

    setStatus('loading')
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)

    try {
      if (isEntry) {
        await gateService.openEntry(communityId)
      } else {
        await gateService.openExit(communityId)
      }
      setStatus('success')
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err: any) {
      setStatus('error')
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo abrir la puerta')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  const bgColor = locked ? '#334155' :
    status === 'success' ? '#22C55E' :
    status === 'error'   ? '#EF4444' :
    darkColor

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        style={{
          backgroundColor: bgColor,
          borderRadius: 24,
          padding: 24,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 140,
          shadowColor: bgColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        {locked ? (
          <>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Ionicons name="lock-closed" size={32} color="#64748B" />
            </View>
            <Text style={{ color: '#64748B', fontWeight: '700', fontSize: 14, textAlign: 'center' }}>{label}</Text>
            <Text style={{ color: '#475569', fontSize: 11, marginTop: 4, textAlign: 'center' }}>Pago pendiente</Text>
          </>
        ) : status === 'loading' ? (
          <ActivityIndicator color="white" size="large" />
        ) : status === 'success' ? (
          <>
            <Ionicons name="checkmark-circle" size={48} color="white" />
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 14, marginTop: 10, textAlign: 'center' }}>
              {successMsg}
            </Text>
          </>
        ) : (
          <>
            {/* Outer glow ring */}
            <View style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}>
              <Ionicons name={icon as any} size={36} color="white" />
            </View>
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 15, textAlign: 'center', letterSpacing: 0.3 }}>
              {label}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4, textAlign: 'center' }}>
              Toca para abrir
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  )
}

// ── Quick Action ──────────────────────────────────────────────
function QuickAction({ icon, label, onPress, locked }: { icon: string; label: string; onPress: () => void; locked?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: '44%',
        backgroundColor: '#1E293B',
        borderRadius: 18,
        padding: 18,
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: locked ? '#1E293B' : '#334155',
        opacity: locked ? 0.5 : 1,
      }}
      activeOpacity={0.75}
    >
      <Text style={{ fontSize: 28 }}>{icon}</Text>
      <Text style={{ color: locked ? '#64748B' : 'white', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
    </TouchableOpacity>
  )
}

// ── Admin Action (larger card for management) ─────────────────
function AdminAction({ icon, color, label, sub, onPress }: {
  icon: string; color: string; label: string; sub: string; onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flex: 1, minWidth: '44%',
        backgroundColor: '#1E293B',
        borderRadius: 18, padding: 16,
        borderWidth: 1, borderColor: '#334155',
        gap: 10,
      }}
    >
      <View style={{
        width: 42, height: 42, borderRadius: 12,
        backgroundColor: `${color}20`,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <View>
        <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>{label}</Text>
        <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{sub}</Text>
      </View>
    </TouchableOpacity>
  )
}

// ── Main Screen ───────────────────────────────────────────────
export default function DashboardScreen() {
  const { user } = useAuthStore()
  const { data: meData, isRefetching, refetch } = useMe()
  const role = user?.communityRole ?? user?.role ?? 'RESIDENT'
  const communityId = user?.communityId ?? ''
  const firstName = user?.firstName ?? 'Usuario'
  const initial = firstName[0]?.toUpperCase() ?? 'C'
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'

  const isResident = role === 'RESIDENT' || role === 'COMMUNITY_ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER'
  const isGuard = role === 'GUARD'
  const isAdmin =
    user?.role === 'SUPER_ADMIN' ||
    user?.communityRole === 'SUPER_ADMIN' ||
    user?.communityRole === 'COMMUNITY_ADMIN' ||
    user?.communityRole === 'MANAGER'
  const { hasPending } = useHasPendingPayments()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3B82F6" />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
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
        <View style={{
          backgroundColor: '#1E293B',
          borderRadius: 20,
          padding: 18,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: '#334155',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '600', letterSpacing: 1 }}>COMUNIDAD ACTIVA</Text>
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

        {/* ── Gate Buttons (residents & admins) ── */}
        {isResident && communityId ? (
          <View style={{ marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 }}>
              <Ionicons name="keypad-outline" size={18} color="#94A3B8" />
              <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 }}>
                CONTROL DE ACCESO
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <GateButton type="entry" communityId={communityId} locked={hasPending} />
              <GateButton type="exit" communityId={communityId} locked={hasPending} />
            </View>
            {hasPending ? (
              <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/payments')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                <Ionicons name="alert-circle-outline" size={14} color="#F97316" />
                <Text style={{ color: '#F97316', fontSize: 12 }}>Tienes pagos pendientes — toca para pagar</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 10 }}>
                El comando expira en 30 segundos si no hay respuesta del hardware
              </Text>
            )}
          </View>
        ) : null}

        {/* Guard quick scan */}
        {isGuard && (
          <TouchableOpacity
            onPress={() => router.push('/(app)/(tabs)/gate')}
            style={{
              backgroundColor: '#1D4ED8',
              borderRadius: 20,
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              marginBottom: 28,
            }}
            activeOpacity={0.8}
          >
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="scan" size={28} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontSize: 17, fontWeight: '700' }}>Escanear QR</Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 }}>Verificar pase de visitante</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        )}

        {/* ── Admin / Manager management section ── */}
        {isAdmin && (
          <>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 14 }}>Gestión</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
              <AdminAction
                icon="home-outline"
                color="#3B82F6"
                label="Agregar casa"
                sub="Nueva unidad"
                onPress={() => router.push('/(app)/residents' as any)}
              />
              <AdminAction
                icon="person-add-outline"
                color="#10B981"
                label="Agregar residente"
                sub="Nuevo habitante"
                onPress={() => router.push('/(app)/residents' as any)}
              />
              <AdminAction
                icon="grid-outline"
                color="#F59E0B"
                label="Unidades"
                sub="Dashboard y stats"
                onPress={() => router.push('/(app)/units' as any)}
              />
              <AdminAction
                icon="people-outline"
                color="#8B5CF6"
                label="Residentes"
                sub="Ver y editar"
                onPress={() => router.push('/(app)/residents' as any)}
              />
              <AdminAction
                icon="settings-outline"
                color="#94A3B8"
                label="Panel Admin"
                sub="Reportes y stats"
                onPress={() => router.push('/(app)/(tabs)/admin' as any)}
              />
            </View>
          </>
        )}

        {/* ── Regular quick actions ── */}
        <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 14 }}>Acciones rápidas</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          {role !== 'GUARD' && (
            <QuickAction
              icon={hasPending ? '🔒' : '👥'}
              label="Invitar visita"
              locked={hasPending}
              onPress={() => hasPending
                ? Alert.alert('Pago pendiente', 'Realiza tu pago para crear pases de visita.')
                : router.push('/(app)/(tabs)/visitors')}
            />
          )}
          {!isAdmin && role !== 'GUARD' && (
            <QuickAction icon="💳" label="Pagar cuota" onPress={() => router.push('/(app)/(tabs)/payments')} />
          )}
          {role !== 'GUARD' && (
            <QuickAction
              icon={hasPending ? '🔒' : '📅'}
              label="Reservar área"
              locked={hasPending}
              onPress={() => hasPending
                ? Alert.alert('Pago pendiente', 'Realiza tu pago para hacer reservaciones.')
                : router.push('/(app)/(tabs)/reservations')}
            />
          )}
          <QuickAction icon="🔧" label="Reportar" onPress={() => router.push('/(app)/workorder/new' as any)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
