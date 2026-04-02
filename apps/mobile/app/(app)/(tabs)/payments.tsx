import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function PaymentsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6">
      <Text className="text-4xl mb-4">💳</Text>
      <Text className="text-white text-xl font-bold mb-2">Payments</Text>
      <Text className="text-surface-muted text-center">Maintenance fees and Stripe integration — implemented in Phase 4</Text>
    </SafeAreaView>
  )
}
