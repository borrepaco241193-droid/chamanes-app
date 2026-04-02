import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../../../src/stores/auth.store'

// Full dashboard implemented in Phase 2
export default function DashboardScreen() {
  const { user } = useAuthStore()

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-surface-muted text-sm">Welcome back,</Text>
            <Text className="text-white text-2xl font-bold">{user?.firstName ?? 'Resident'}</Text>
          </View>
          <View className="w-11 h-11 rounded-full bg-primary-500 items-center justify-center">
            <Text className="text-white font-bold text-lg">
              {user?.firstName?.[0] ?? 'C'}
            </Text>
          </View>
        </View>

        {/* Status card */}
        <View className="bg-surface-card border border-surface-border rounded-3xl p-5 mb-4">
          <Text className="text-surface-muted text-xs font-medium uppercase tracking-wider mb-1">Community Status</Text>
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-success" />
            <Text className="text-white font-semibold">All systems operational</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text className="text-white font-semibold text-lg mb-3">Quick Actions</Text>
        <View className="flex-row gap-3 mb-6">
          <QuickAction icon="👥" label="Invite Visitor" />
          <QuickAction icon="💳" label="Pay Fee" />
          <QuickAction icon="📅" label="Reserve" />
          <QuickAction icon="🔧" label="Report Issue" />
        </View>

        {/* Phase notice */}
        <View className="bg-primary-500/10 border border-primary-500/30 rounded-2xl p-4">
          <Text className="text-primary-400 font-semibold mb-1">Phase 1 Complete</Text>
          <Text className="text-surface-muted text-sm">
            Foundation is set up. Auth, dashboard data, and all features come in Phase 2+
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

function QuickAction({ icon, label }: { icon: string; label: string }) {
  return (
    <View className="flex-1 bg-surface-card border border-surface-border rounded-2xl p-3 items-center gap-2">
      <Text className="text-2xl">{icon}</Text>
      <Text className="text-white text-xs font-medium text-center">{label}</Text>
    </View>
  )
}
