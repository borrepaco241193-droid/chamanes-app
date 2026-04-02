import { Tabs } from 'expo-router'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../../src/stores/auth.store'

type IconName = React.ComponentProps<typeof Ionicons>['name']

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View className={`items-center justify-center w-10 h-10 rounded-2xl ${focused ? 'bg-primary-500/20' : ''}`}>
      <Ionicons name={name} size={22} color={focused ? '#3B82F6' : '#64748B'} />
    </View>
  )
}

export default function TabsLayout() {
  const { user } = useAuthStore()
  const isAdmin = user?.communityRole === 'COMMUNITY_ADMIN' || user?.role === 'SUPER_ADMIN'
  const isGuard = user?.communityRole === 'GUARD'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1E293B',
          borderTopColor: '#334155',
          height: 70,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter_500Medium' },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      {/* Dashboard — all roles */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />

      {/* Visitor passes — residents & guards */}
      <Tabs.Screen
        name="visitors"
        options={{
          title: 'Visitors',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />,
        }}
      />

      {/* Payments — residents only */}
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          href: isGuard ? null : undefined, // Hide from guards
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'card' : 'card-outline'} focused={focused} />,
        }}
      />

      {/* Reservations — residents */}
      <Tabs.Screen
        name="reservations"
        options={{
          title: 'Reserve',
          href: isGuard ? null : undefined,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />,
        }}
      />

      {/* Admin — admin only */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} />,
        }}
      />

      {/* Gate scanner — guards only */}
      <Tabs.Screen
        name="gate"
        options={{
          title: 'Gate',
          href: isGuard ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'scan' : 'scan-outline'} focused={focused} />,
        }}
      />
    </Tabs>
  )
}
