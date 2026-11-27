import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, useFonts } from '@expo-google-fonts/figtree'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import 'react-native-reanimated'
import { AppProviders } from '@/components/app-providers'
import { PrefsProvider, usePrefs } from '@/features/prefs/prefs-provider'

void SplashScreen.preventAutoHideAsync().catch(() => undefined)

function ThemedStack() {
  const { dark, palette, ready } = usePrefs()
  return (
    <>
      <Stack screenOptions={{ contentStyle: { backgroundColor: palette.bg }, headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
      {ready ? <StatusBar style={dark ? 'light' : 'dark'} /> : null}
    </>
  )
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold })
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync().catch(() => undefined)
  }, [loaded, error])
  if (!loaded && !error) return null
  return (
    <PrefsProvider>
      <AppProviders>
        <ThemedStack />
      </AppProviders>
    </PrefsProvider>
  )
}
