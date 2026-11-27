import { UserRound } from 'lucide-react-native'
import { useEffect } from 'react'
import { Text, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Path, Rect } from 'react-native-svg'
import { avatarBg, fonts, motion } from '@/constants/theme'
import { usePalette } from '@/features/prefs/prefs-provider'

const ease = Easing.bezier(0.22, 1, 0.36, 1)

/** "Closing Wave" logo mark (Canva concept 02). */
export function LogoMark({ size = 32, color }: { size?: number; color?: string }) {
  const p = usePalette()
  const c = color ?? p.primary
  return (
    <Svg fill="none" height={size} stroke={c} strokeLinecap="round" strokeLinejoin="round" strokeWidth={4.5} viewBox="0 0 64 64" width={size}>
      <Path d="M14 42c-4-5-6-11-5-17C11 13 20 7 32 7c14 0 25 11 25 25S46 57 32 57C20 57 12 50 10 39c-1-8 3-15 9-18" />
      <Path d="M19 32h5l4-8 6 16 5-11 3 3h4" />
    </Svg>
  )
}

export function Logo({ size = 28 }: { size?: number }) {
  const p = usePalette()
  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10 }}>
      <LogoMark size={size} />
      <Text style={{ color: p.text, fontFamily: fonts.bold, fontSize: size * 0.66, letterSpacing: -0.4 }}>SpeakPay</Text>
    </View>
  )
}

/** Frozen mark: the shield sealed in a block of ice. */
export function IceCube({ size = 24, color, strokeWidth = 2.25 }: { size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} viewBox="0 0 48 48" width={size}>
      <Rect fill={color} fillOpacity={0.14} height={38} rx={10} width={38} x={5} y={5} />
      <Path d="M11.5 17v-2.5a3 3 0 0 1 3-3H17" strokeOpacity={0.75} />
      <Path d="M11.5 22v-1.5" strokeOpacity={0.55} />
      <Path d="M24 13.5c3.2 2.3 6.3 3 9 3v7.2c0 5.3-3.2 8.6-9 11.3-5.8-2.7-9-6-9-11.3v-7.2c2.7 0 5.8-.7 9-3Z" />
      <Path d="M36.5 34.5l1.2-1.2" strokeOpacity={0.75} />
    </Svg>
  )
}

/** No photos: a soft colour + the username's first letter. */
export function Avatar({ username, color, size = 40 }: { username: string; color: string; size?: number }) {
  return (
    <View style={{ alignItems: 'center', backgroundColor: avatarBg(color), borderRadius: size / 2, height: size, justifyContent: 'center', width: size }}>
      {username ? (
        <Text style={{ color: '#1B0B2E', fontFamily: fonts.bold, fontSize: size * 0.42 }}>{username.charAt(0).toUpperCase()}</Text>
      ) : (
        <UserRound color="#1B0B2E" size={size * 0.5} strokeWidth={1.75} />
      )}
    </View>
  )
}

function Dot({ on, done }: { on: boolean; done: boolean }) {
  const p = usePalette()
  const w = useSharedValue(on ? 22 : 8)
  useEffect(() => {
    w.set(withTiming(on ? 22 : 8, { duration: motion.med, easing: ease }))
  }, [on, w])
  const style = useAnimatedStyle(() => ({ width: w.value }))
  return <Animated.View style={[{ backgroundColor: on ? p.primary : done ? p.primary : p.surface3, borderRadius: 3, height: 6, opacity: done && !on ? 0.45 : 1 }, style]} />
}

/** Phantom-style progress dots; the active one stretches with an eased animation. */
export function SetupDots({ step, total }: { step: number; total: number }) {
  return (
    <View accessibilityLabel={`Step ${step} of ${total}`} style={{ alignSelf: 'center', flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <Dot done={i + 1 < step} key={i} on={i + 1 === step} />
      ))}
    </View>
  )
}
