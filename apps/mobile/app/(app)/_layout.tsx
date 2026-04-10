import { Redirect, Stack } from 'expo-router'
import { useAuthStore } from '../../src/stores/auth.store'

export default function AppLayout() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />
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
    </Stack>
  )
}
