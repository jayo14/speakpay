import * as Haptics from 'expo-haptics'
import { Delete, Fingerprint } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated'
import { fonts } from '@/constants/theme'
import { PIN_LENGTH } from '@/features/lock/pin'
import { usePalette } from '@/features/prefs/prefs-provider'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'] as const

/**
 * 6-dot PIN entry. Calls onComplete with the full PIN; bump `errorKey` to play the shake and clear.
 */
export function PinPad({
  onComplete,
  errorKey = 0,
  onBiometric,
  disabled,
}: {
  onComplete: (pin: string) => void
  errorKey?: number
  onBiometric?: () => void
  disabled?: boolean
}) {
  const p = usePalette()
  const [pin, setPin] = useState('')
  const shake = useSharedValue(0)

  useEffect(() => {
    if (!errorKey) return
    setPin('')
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined)
    const e = Easing.inOut(Easing.quad)
    shake.set(
      withSequence(
        withTiming(-10, { duration: 50, easing: e }),
        withTiming(10, { duration: 70, easing: e }),
        withTiming(-6, { duration: 60, easing: e }),
        withTiming(0, { duration: 60, easing: e }),
      ),
    )
  }, [errorKey, shake])

  const dotsStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }))

  const press = (k: (typeof KEYS)[number]) => {
    if (disabled) return
    if (k === 'bio') return onBiometric?.()
    void Haptics.selectionAsync().catch(() => undefined)
    if (k === 'del') return setPin((v) => v.slice(0, -1))
    setPin((v) => {
      const next = (v + k).slice(0, PIN_LENGTH)
      if (next.length === PIN_LENGTH) setTimeout(() => onComplete(next), 120)
      return next
    })
  }

  return (
    <View style={{ alignItems: 'center', gap: 36 }}>
      <Animated.View accessibilityLabel={`${pin.length} of ${PIN_LENGTH} digits entered`} style={[{ flexDirection: 'row', gap: 14 }, dotsStyle]}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View
            key={i}
            style={{
              backgroundColor: i < pin.length ? p.primary : 'transparent',
              borderColor: i < pin.length ? p.primary : p.textMuted,
              borderRadius: 8,
              borderWidth: 2,
              height: 16,
              width: 16,
            }}
          />
        ))}
      </Animated.View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 300, rowGap: 14, columnGap: 22 }}>
        {KEYS.map((k) => {
          const hidden = k === 'bio' && !onBiometric
          return (
            <Pressable
              accessibilityLabel={k === 'del' ? 'Delete' : k === 'bio' ? 'Use fingerprint' : k}
              disabled={hidden || disabled}
              key={k}
              onPress={() => press(k)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: pressed && !hidden ? p.surface2 : 'transparent',
                borderRadius: 38,
                height: 76,
                justifyContent: 'center',
                opacity: hidden ? 0 : 1,
                width: 76,
              })}
            >
              {k === 'del' ? (
                <Delete color={p.text} size={26} strokeWidth={1.75} />
              ) : k === 'bio' ? (
                <Fingerprint color={p.primary} size={30} strokeWidth={1.75} />
              ) : (
                <Text style={{ color: p.text, fontFamily: fonts.semibold, fontSize: 28 }}>{k}</Text>
              )}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
