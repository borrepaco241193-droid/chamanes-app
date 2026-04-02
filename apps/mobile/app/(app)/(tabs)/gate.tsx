import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function GateScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6">
      <Text className="text-4xl mb-4">🚪</Text>
      <Text className="text-white text-xl font-bold mb-2">Gate Scanner</Text>
      <Text className="text-surface-muted text-center">QR code scanning and real-time gate control — implemented in Phase 3</Text>
    </SafeAreaView>
  )
}
