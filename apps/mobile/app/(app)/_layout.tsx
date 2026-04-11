import { Redirect, Stack } from 'expo-router'
import { useAuthStore } from '../../src/stores/auth.store'

export default function AppLayout() {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  // SUPER_ADMIN must select a community before accessing the app
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  if (isSuperAdmin && !user?.communityId) {
    return <Redirect href="/(app)/communities" />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F172A' },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="visitor/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="visitor/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="reservation/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="workorder/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="workorder/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="residents" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="resident/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="communities" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="units" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="reports" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="verify-identity" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
    </Stack>
  )
}
