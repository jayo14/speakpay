import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useColorScheme } from 'react-native'
import { palettes, type Palette } from '@/constants/theme'

// Device-only preferences (never sent to a server). The PIN lives separately in the secure keystore.
export type ThemePref = 'system' | 'light' | 'dark'

export interface Prefs {
  username: string
  avatar: string
  theme: ThemePref
  cancelWindow: string
  biometric: boolean
  welcomed: boolean
  profileDone: boolean
  pinDone: boolean
  biometricAsked: boolean
}

const DEFAULTS: Prefs = {
  username: '',
  avatar: 'lavender',
  theme: 'system',
  cancelWindow: '5',
  biometric: false,
  welcomed: false,
  profileDone: false,
  pinDone: false,
  biometricAsked: false,
}

const KEY = 'speakpay.prefs.v1'

interface Ctx {
  prefs: Prefs
  ready: boolean
  set: (patch: Partial<Prefs>) => void
  reset: () => void
  palette: Palette
  dark: boolean
}

const PrefsContext = createContext<Ctx | null>(null)

export function PrefsProvider({ children }: PropsWithChildren) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS)
  const [ready, setReady] = useState(false)
  const scheme = useColorScheme()

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setPrefs({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) })
      })
      .catch(() => undefined)
      .finally(() => setReady(true))
  }, [])

  const set = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch }
      void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setPrefs(DEFAULTS)
    void AsyncStorage.removeItem(KEY).catch(() => undefined)
  }, [])

  const dark = prefs.theme === 'system' ? scheme === 'dark' : prefs.theme === 'dark'
  const value = useMemo<Ctx>(
    () => ({ prefs, ready, set, reset, palette: dark ? palettes.dark : palettes.light, dark }),
    [prefs, ready, set, reset, dark],
  )
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs() {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used inside PrefsProvider')
  return ctx
}

/** Current palette (light/dark from device or the user's choice). */
export function usePalette() {
  return usePrefs().palette
}
