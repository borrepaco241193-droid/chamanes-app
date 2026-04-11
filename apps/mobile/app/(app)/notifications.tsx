import React from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useNotifications, useMarkAllRead, useMarkNotificationRead } from '../../src/hooks/useNotifications'
import { notificationService } from '../../src/services/notification.service'
import type { AppNotification } from '../../src/services/notification.service'

// ── Type config ───────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  visitor_arrived:       { icon: 'person-add',       color: '#22C55E', label: 'Visita' },
  payment_due:           { icon: 'card',             color: '#F59E0B', label: 'Pago' },
  payment_confirmed:     { icon: 'checkmark-circle', color: '#10B981', label: 'Pago confirmado' },
  reservation_confirmed: { icon: 'calendar-check',  color: '#3B82F6', label: 'Reservación' },
  work_order:            { icon: 'construct',        color: '#8B5CF6', label: 'Tarea' },
  announcement:          { icon: 'megaphone',        color: '#F97316', label: 'Anuncio' },
}

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? { icon: 'notifications', color: '#64748B', label: 'Notificación' }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `Hace ${diffMins} min`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `Hace ${diffHrs}h`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `Hace ${diffDays}d`
  return d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
}

function NotificationCard({
  notification,
  onPress,
}: {
  notification: AppNotification
  onPress: () => void
}) {
  const cfg = getTypeConfig(notification.type)
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: notification.isRead ? '#1E293B' : '#1E3A5F',
        borderRadius: 16,
        padding: 16,
        gap: 14,
        borderWidth: 1,
        borderColor: notification.isRead ? '#334155' : '#3B82F6',
      }}
    >
      {/* Icon */}
      <View style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: `${cfg.color}20`,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
      </View>

      {/* Content */}
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600' }}>{cfg.label.toUpperCase()}</Text>
          <Text style={{ color: '#64748B', fontSize: 11 }}>{formatTime(notification.createdAt)}</Text>
        </View>
        <Text style={{ color: 'white', fontSize: 14, fontWeight: notification.isRead ? '400' : '600' }}>
          {notification.title}
        </Text>
        <Text style={{ color: '#94A3B8', fontSize: 13 }} numberOfLines={2}>
          {notification.body}
        </Text>
      </View>

      {/* Unread dot */}
      {!notification.isRead && (
        <View style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#3B82F6',
          marginTop: 4,
          flexShrink: 0,
        }} />
      )}
    </TouchableOpacity>
  )
}

export default function NotificationsScreen() {
  const { data, isLoading, isFetching, refetch } = useNotifications()
  const { mutate: markRead } = useMarkNotificationRead()
  const { mutate: markAllRead, isPending: markingAll } = useMarkAllRead()
  const [seeding, setSeeding] = React.useState(false)

  async function handleSeedDemo() {
    setSeeding(true)
    try {
      const result = await notificationService.seedDemo()
      await refetch()
      Alert.alert('Listo', `${result.created} notificaciones de prueba creadas`)
    } catch {
      Alert.alert('Error', 'No se pudieron crear las notificaciones de prueba')
    } finally {
      setSeeding(false)
    }
  }

  const notifications = data?.notifications ?? []
  const unreadCount = data?.unreadCount ?? 0

  function handlePress(n: AppNotification) {
    if (!n.isRead) {
      markRead(n.id)
    }
    // Navigate based on type
    switch (n.type) {
      case 'visitor_arrived':
        router.replace('/(app)/(tabs)/visitors')
        break
      case 'payment_due':
      case 'payment_confirmed':
        router.replace('/(app)/(tabs)/payments')
        break
      case 'reservation_confirmed':
        router.replace('/(app)/(tabs)/reservations')
        break
      case 'work_order':
        router.replace('/(app)/(tabs)/workorders')
        break
      default:
        break
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Notificaciones</Text>
          {unreadCount > 0 && (
            <Text style={{ color: '#64748B', fontSize: 13 }}>{unreadCount} sin leer</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={() => markAllRead()}
            disabled={markingAll}
            style={{
              backgroundColor: '#1E293B',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: '#334155',
            }}
          >
            <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '600' }}>
              {markingAll ? 'Marcando...' : 'Leer todo'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor="#3B82F6" />
          }
        >
          {notifications.length === 0 ? (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 80,
              gap: 12,
            }}>
              <View style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: '#1E293B',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons name="notifications-off-outline" size={32} color="#475569" />
              </View>
              <Text style={{ color: '#64748B', fontSize: 16 }}>Sin notificaciones</Text>
              <Text style={{ color: '#475569', fontSize: 13, textAlign: 'center' }}>
                Aquí aparecerán visitas, pagos y más
              </Text>
              <TouchableOpacity
                onPress={handleSeedDemo}
                disabled={seeding}
                style={{
                  marginTop: 8,
                  backgroundColor: '#1E293B',
                  borderRadius: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: '#334155',
                }}
              >
                <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '600' }}>
                  {seeding ? 'Creando...' : 'Generar notificaciones de prueba'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            notifications.map((n) => (
              <NotificationCard key={n.id} notification={n} onPress={() => handlePress(n)} />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
