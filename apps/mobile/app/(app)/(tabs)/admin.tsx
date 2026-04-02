import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function AdminScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6">
      <Text className="text-4xl mb-4">⚙️</Text>
      <Text className="text-white text-xl font-bold mb-2">Admin Panel</Text>
      <Text className="text-surface-muted text-center">Community management dashboard — implemented in Phase 5</Text>
    </SafeAreaView>
  )
}
