import { Tabs } from 'expo-router'
import { View, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../../src/stores/auth.store'

type IconName = React.ComponentProps<typeof Ionicons>['name']

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={{
      alignItems: 'center', justifyContent: 'center',
      width: 40, height: 40, borderRadius: 16,
      backgroundColor: focused ? 'rgba(59,130,246,0.15)' : 'transparent',
    }}>
      <Ionicons name={name} size={22} color={focused ? '#3B82F6' : '#64748B'} />
    </View>
  )
}

export default function TabsLayout() {
  const { user } = useAuthStore()
  const isAdmin =
    user?.communityRole === 'COMMUNITY_ADMIN' ||
    user?.communityRole === 'MANAGER' ||
    user?.role === 'SUPER_ADMIN'
  const isGuard = user?.communityRole === 'GUARD'
  const isStaff = user?.communityRole === 'STAFF'

  // Extra bottom padding on Android to clear the gesture navigation bar
  const tabBarPaddingBottom = Platform.OS === 'android' ? 18 : 10

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1E293B',
          borderTopColor: '#334155',
          height: Platform.OS === 'android' ? 72 + tabBarPaddingBottom : 70,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 6,
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      {/* Home — all roles */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />

      {/* Visitors — residents, admins, guards */}
      <Tabs.Screen
        name="visitors"
        options={{
          title: 'Visitas',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />,
        }}
      />

      {/* Payments — not guards */}
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Pagos',
          href: isGuard ? null : undefined,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'card' : 'card-outline'} focused={focused} />,
        }}
      />

      {/* Reservations — not guards */}
      <Tabs.Screen
        name="reservations"
        options={{
          title: 'Reservar',
          href: isGuard ? null : undefined,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />,
        }}
      />

      {/* Staff — guards, admins, staff only */}
      <Tabs.Screen
        name="staff"
        options={{
          title: 'Turno',
          href: (!isGuard && !isAdmin && !isStaff) ? null : undefined,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people-circle' : 'people-circle-outline'} focused={focused} />,
        }}
      />

      {/* Work Orders — all roles except guard hidden previously, now visible to guard+staff too */}
      <Tabs.Screen
        name="workorders"
        options={{
          title: 'Tareas',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'construct' : 'construct-outline'} focused={focused} />,
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

      {/* Admin — hidden from tab bar, accessible via Quick Action on Home */}
      <Tabs.Screen
        name="admin"
        options={{
          href: null, // always hidden from tab bar
          tabBarIcon: ({ focused }) => <TabIcon name="settings-outline" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
