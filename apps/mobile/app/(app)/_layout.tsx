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
      <Stack.Screen name="payment/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="reservation/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="admin" />
    </Stack>
  )
}
