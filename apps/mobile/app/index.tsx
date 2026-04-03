import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from '../src/stores/auth.store'

export default function Index() {
  const { isAuthenticated, isHydrated } = useAuthStore()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    // Si SecureStore no responde en 3 segundos, redirigir a login
    const timer = setTimeout(() => {
      if (!isHydrated) setTimedOut(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [isHydrated])

  if (!isHydrated && !timedOut) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    )
  }

  return <Redirect href={isAuthenticated ? '/(app)/(tabs)' : '/(auth)/login'} />
}
