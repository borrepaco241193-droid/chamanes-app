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

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Chamanes',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
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
