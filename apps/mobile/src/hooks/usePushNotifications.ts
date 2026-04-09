import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import { useAuthStore } from '../stores/auth.store'
import { registerForPushNotifications, handleNotificationResponse } from '../lib/notifications'

// ============================================================
// usePushNotifications
//
// Call once at the root layout.
// - Registers push token with the backend when the user logs in
// - Sets up a listener to navigate when a notification is tapped
// - Cleans up the listener on unmount or logout
// ============================================================

export function usePushNotifications(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const responseListener = useRef<Notifications.EventSubscription | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      responseListener.current?.remove()
      responseListener.current = null
      return
    }

    registerForPushNotifications()

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    )

    return () => {
      responseListener.current?.remove()
      responseListener.current = null
    }
  }, [isAuthenticated])
}
