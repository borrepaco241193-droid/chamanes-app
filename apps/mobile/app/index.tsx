import { Redirect } from 'expo-router'
import { useAuthStore } from '../src/stores/auth.store'

// Root entry point: redirect based on auth state
export default function Index() {
  const { isAuthenticated, isHydrated } = useAuthStore()

  // Wait for store to rehydrate from SecureStore
  if (!isHydrated) return null

  return <Redirect href={isAuthenticated ? '/(app)/(tabs)' : '/(auth)/login'} />
}
