import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors } from '@/constants/app-styles'

// Swiss button: 1px border, no radius, no shadow (PRD §8.1).
export function AppButton({
  title,
  onPress,
  disabled,
  busy,
  variant = 'primary',
}: {
  title: string
  onPress: () => void
  disabled?: boolean
  busy?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
}) {
  const primary = variant === 'primary'
  const tint = variant === 'danger' ? colors.block : colors.ink
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { borderColor: tint, backgroundColor: primary ? tint : colors.bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? colors.bg : tint} />
      ) : (
        <Text style={[styles.label, { color: primary ? colors.bg : tint }]}>{title}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 16 },
  label: { fontSize: 16, fontWeight: '600' },
})
