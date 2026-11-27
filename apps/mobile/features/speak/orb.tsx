import { Check, Mic, Shield, ShieldX } from 'lucide-react-native'
import { useEffect } from 'react'
import { Pressable, View } from 'react-native'
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming, ZoomIn } from 'react-native-reanimated'
import { IceCube } from '@/components/brand'
import { usePalette } from '@/features/prefs/prefs-provider'

export type OrbState = 'idle' | 'listening' | 'working' | 'paid' | 'blocked' | 'frozen'

const SIZE = 168
const ease = Easing.bezier(0.22, 1, 0.36, 1)

export function Orb({ state, level, disabled, onPressIn, onPressOut }: { state: OrbState; level: number; disabled?: boolean; onPressIn: () => void; onPressOut: () => void }) {
  const p = usePalette()
  const breathe = useSharedValue(1)
  const spin = useSharedValue(0)
  const lvl = useSharedValue(0)
  const press = useSharedValue(1)

  useEffect(() => {
    breathe.set(withRepeat(withTiming(1.08, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true))
    spin.set(withRepeat(withTiming(360, { duration: 1100, easing: Easing.linear }), -1, false))
  }, [breathe, spin])
  useEffect(() => {
    lvl.set(withTiming(level, { duration: 90 }))
  }, [level, lvl])
  useEffect(() => {
    press.set(withTiming(state === 'listening' ? 1.06 : 1, { duration: 280, easing: ease }))
  }, [state, press])

  const ring = useAnimatedStyle(() => ({ opacity: 0.18 * (2 - breathe.value * 0.9), transform: [{ scale: breathe.value }] }))
  const wave1 = useAnimatedStyle(() => ({ transform: [{ scale: 1 + lvl.value * 0.45 }] }))
  const wave2 = useAnimatedStyle(() => ({ transform: [{ scale: 1.08 + lvl.value * 0.7 }] }))
  const arc = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }))
  const body = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }))

  const result = state === 'paid' || state === 'blocked' || state === 'frozen'
  const accent = state === 'paid' ? p.paid : state === 'blocked' ? p.blocked : state === 'frozen' ? p.frozen : p.primary
  const fg = result ? accent : p.primaryText
  const icon =
    state === 'working' ? (
      <Shield color={fg} size={64} strokeWidth={1.5} />
    ) : state === 'paid' ? (
      <Check color={fg} size={80} strokeWidth={3} />
    ) : state === 'blocked' ? (
      <ShieldX color={fg} size={72} strokeWidth={2.25} />
    ) : state === 'frozen' ? (
      <IceCube color={fg} size={84} strokeWidth={2.5} />
    ) : (
      <Mic color={fg} size={64} strokeWidth={1.5} />
    )

  const halo = { borderRadius: SIZE, height: SIZE, position: 'absolute' as const, width: SIZE }
  return (
    <View style={{ alignItems: 'center', height: 248, justifyContent: 'center', width: 248 }}>
      {state === 'idle' ? <Animated.View style={[halo, { borderColor: p.primary, borderWidth: 2 }, ring]} /> : null}
      {state === 'listening' ? (
        <>
          <Animated.View style={[halo, { backgroundColor: p.primary, opacity: 0.1 }, wave2]} />
          <Animated.View style={[halo, { backgroundColor: p.primary, opacity: 0.16 }, wave1]} />
        </>
      ) : null}
      {state === 'working' ? (
        <Animated.View style={[{ borderColor: 'transparent', borderRadius: 92, borderTopColor: p.primary, borderWidth: 3, height: 184, position: 'absolute', width: 184 }, arc]} />
      ) : null}
      <Pressable
        accessibilityLabel={state === 'listening' ? 'Listening — release to send' : 'Hold to speak'}
        accessibilityRole="button"
        disabled={disabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Animated.View
          style={[
            {
              alignItems: 'center',
              backgroundColor: result ? (state === 'frozen' ? p.frozenSoft : p.surface) : p.primary,
              borderColor: accent,
              borderRadius: SIZE / 2,
              borderWidth: result ? 3 : 0,
              elevation: 8,
              height: SIZE,
              justifyContent: 'center',
              shadowColor: '#3D1766',
              shadowOffset: { height: 18, width: 0 },
              shadowOpacity: 0.18,
              shadowRadius: 24,
              width: SIZE,
            },
            body,
          ]}
        >
          <Animated.View entering={state === 'idle' ? FadeIn.duration(220) : ZoomIn.duration(280).easing(ease)} key={state}>
            {icon}
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  )
}
