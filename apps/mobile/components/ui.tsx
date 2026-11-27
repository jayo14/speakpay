import { PropsWithChildren, ReactNode, useEffect } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleProp, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native'
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fonts, motion, radius } from '@/constants/theme'
import { usePalette } from '@/features/prefs/prefs-provider'

const ease = Easing.bezier(0.22, 1, 0.36, 1)

type Variant = 'h1' | 'h2' | 'body' | 'label' | 'muted' | 'small' | 'num' | 'big' | 'mono'

export function Txt({ variant = 'body', color, style, ...rest }: TextProps & { variant?: Variant; color?: string }) {
  const p = usePalette()
  const base: Record<Variant, TextStyle> = {
    h1: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.4, color: p.text },
    h2: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: p.text },
    body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: p.text },
    label: { fontFamily: fonts.semibold, fontSize: 13, color: p.textMuted },
    muted: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: p.textMuted },
    small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: p.textMuted },
    num: { fontFamily: fonts.bold, fontSize: 22, color: p.text, fontVariant: ['tabular-nums'] },
    big: { fontFamily: fonts.bold, fontSize: 40, letterSpacing: -1, color: p.text, fontVariant: ['tabular-nums'] },
    mono: { fontFamily: 'monospace', fontSize: 13, color: p.textMuted },
  }
  return <Text {...rest} style={[base[variant], color ? { color } : null, style]} />
}

/** Screen container: safe area, scroll, and a gentle ease-in on mount. */
export function Screen({ children, scroll = true, header }: PropsWithChildren<{ scroll?: boolean; header?: ReactNode }>) {
  const p = usePalette()
  const body = (
    <Animated.View entering={FadeInDown.duration(motion.med).easing(ease)} style={{ gap: 16, paddingBottom: 40 }}>
      {children}
    </Animated.View>
  )
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ backgroundColor: p.bg, flex: 1 }}>
      {header}
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }}>{body}</View>
      )}
    </SafeAreaView>
  )
}

export function Card({ children, style, tone }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; tone?: 'frozen' }>) {
  const p = usePalette()
  return (
    <View
      style={[
        {
          backgroundColor: tone === 'frozen' ? p.frozenSoft : p.surface,
          borderColor: tone === 'frozen' ? p.frozen : p.line,
          borderRadius: radius.card,
          borderWidth: 1,
          gap: 12,
          padding: 20,
          shadowColor: p.shadow,
          shadowOffset: { height: 8, width: 0 },
          shadowOpacity: 1,
          shadowRadius: 24,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'frozen'

export function Button({
  title,
  onPress,
  disabled,
  busy,
  variant = 'primary',
  icon,
  small,
}: {
  title: string
  onPress: () => void
  disabled?: boolean
  busy?: boolean
  variant?: ButtonVariant
  icon?: ReactNode
  small?: boolean
}) {
  const p = usePalette()
  const scale = useSharedValue(1)
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const colors: Record<ButtonVariant, [string, string]> = {
    primary: [p.primary, p.primaryText],
    secondary: [p.surface2, p.text],
    danger: [p.blockedSoft, p.blocked],
    frozen: [p.frozenSoft, p.frozen],
  }
  const [bg, fg] = colors[variant]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: !!busy, disabled: !!disabled }}
      disabled={disabled || busy}
      onPress={onPress}
      onPressIn={() => scale.set(withTiming(0.97, { duration: motion.fast, easing: ease }))}
      onPressOut={() => scale.set(withTiming(1, { duration: motion.fast, easing: ease }))}
    >
      <Animated.View
        style={[
          {
            alignItems: 'center',
            backgroundColor: bg,
            borderRadius: radius.pill,
            flexDirection: 'row',
            gap: 8,
            justifyContent: 'center',
            minHeight: small ? 40 : 52,
            opacity: disabled ? 0.45 : 1,
            paddingHorizontal: small ? 14 : 22,
          },
          anim,
        ]}
      >
        {busy ? <ActivityIndicator color={fg} /> : icon}
        <Txt style={{ color: fg, fontFamily: fonts.bold, fontSize: small ? 14 : 16 }}>{title}</Txt>
      </Animated.View>
    </Pressable>
  )
}

export function Chip({ label, active, onPress, disabled }: { label: string; active?: boolean; onPress: () => void; disabled?: boolean }) {
  const p = usePalette()
  return (
    <Pressable disabled={disabled} onPress={onPress} style={{ opacity: disabled ? 0.45 : 1 }}>
      <View
        style={{
          backgroundColor: active ? p.primarySoft : p.surface,
          borderColor: active ? p.primary : p.line,
          borderRadius: radius.pill,
          borderWidth: 1,
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        <Txt style={{ fontFamily: fonts.semibold }}>{label}</Txt>
      </View>
    </Pressable>
  )
}

/** Animated on/off switch (thumb slides with an eased transition). */
export function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  const p = usePalette()
  const x = useSharedValue(on ? 20 : 0)
  useEffect(() => {
    x.set(withTiming(on ? 20 : 0, { duration: motion.med, easing: ease }))
  }, [on, x])
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onChange(!on)}
      style={{ backgroundColor: on ? p.primary : p.surface3, borderRadius: 15, height: 30, opacity: disabled ? 0.45 : 1, padding: 3, width: 50 }}
    >
      <Animated.View style={[{ backgroundColor: '#FFFFFF', borderRadius: 12, height: 24, width: 24 }, thumb]} />
    </Pressable>
  )
}

export function Row({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[{ alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' }, style]}>{children}</View>
}

export function Divider() {
  const p = usePalette()
  return <View style={{ backgroundColor: p.line, height: 1 }} />
}

export function ErrorText({ children }: PropsWithChildren) {
  const p = usePalette()
  return <Txt style={{ color: p.blocked }}>{children}</Txt>
}
