import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { router } from 'expo-router'
import { notificationService } from '../services/notification.service'

// ============================================================
// Notification configuration
// Sets how notifications appear when the app is in foreground
// ============================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// ── Deep link on notification tap ────────────────────────────

export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): void {
  const data = response.notification.request.content.data as Record<string, string>
  const type = data?.type

  switch (type) {
    case 'visitor_arrived':
      router.push('/(app)/(tabs)/visitors')
      break
    case 'payment_due':
    case 'payment_confirmed':
      router.push('/(app)/(tabs)/payments')
      break
    case 'reservation_confirmed':
      router.push('/(app)/(tabs)/reservations')
      break
    case 'work_order':
      router.push('/(app)/(tabs)/workorders')
      break
    case 'announcement':
    default:
      router.push('/(app)/(tabs)/')
      break
  }
}

// ── Register device for push notifications ────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulators/emulators cannot receive push notifications
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    return null
  }

  // Android requires notification channels — one per urgency level
  if (Platform.OS === 'android') {
    // Default channel — payments, reservations, announcements
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Chamanes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
      sound: 'default',
    })

    // Visitor alarm channel — high importance + alarm sound
    await Notifications.setNotificationChannelAsync('visitor_alarm', {
      name: 'Visitas en puerta',
      description: 'Alertas cuando llega un visitante a tu unidad',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400, 200, 400],
      lightColor: '#22C55E',
      sound: 'default',
      bypassDnd: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    })

    // Work order urgent channel
    await Notifications.setNotificationChannelAsync('work_order_urgent', {
      name: 'Órdenes urgentes',
      description: 'Órdenes de trabajo con prioridad urgente o alta',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 150, 300],
      lightColor: '#EF4444',
      sound: 'default',
    })
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync()
    await notificationService.registerPushToken(tokenData.data)
    return tokenData.data
  } catch (err) {
    console.warn('[Notifications] Failed to register push token:', err)
    return null
  }
}
