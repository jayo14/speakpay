import { Tabs } from 'expo-router'
import { colors } from '@/constants/app-styles'

// PRD §8.2: Vault / Console / Feed. No landing page.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
        tabBarStyle: { borderTopColor: colors.line, borderTopWidth: 1, elevation: 0 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Vault' }} />
      <Tabs.Screen name="console" options={{ title: 'Console' }} />
      <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
    </Tabs>
  )
}
