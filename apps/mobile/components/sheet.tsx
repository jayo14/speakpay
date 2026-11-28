import { PropsWithChildren, useEffect } from 'react'
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { motion } from '@/constants/theme'
import { usePalette } from '@/features/prefs/prefs-provider'

const ease = Easing.bezier(0.22, 1, 0.36, 1)

/**
 * Bottom sheet (receipts) or left drawer (profile & settings). Slides in with an eased transition;
 * the backdrop fades. Tap outside or use Android back to close.
 */
export function Sheet({ open, onClose, side = 'bottom', children }: PropsWithChildren<{ open: boolean; onClose: () => void; side?: 'bottom' | 'left' }>) {
  const p = usePalette()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const t = useSharedValue(0)

  useEffect(() => {
    t.set(withTiming(open ? 1 : 0, { duration: motion.med, easing: ease }))
  }, [open, t])

  const backdrop = useAnimatedStyle(() => ({ opacity: t.value }))
  const panel = useAnimatedStyle(() =>
    side === 'bottom' ? { transform: [{ translateY: (1 - t.value) * 60 }], opacity: t.value } : { transform: [{ translateX: (t.value - 1) * 60 }], opacity: t.value },
  )

  return (
    <Modal animationType="none" onRequestClose={onClose} statusBarTranslucent transparent visible={open}>
      <Animated.View style={[{ backgroundColor: p.overlay, bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }, backdrop]}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View
        style={[
          side === 'bottom'
            ? { backgroundColor: p.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, bottom: 0, left: 0, maxHeight: height * 0.88, position: 'absolute', right: 0 }
            : { backgroundColor: p.bg, borderBottomRightRadius: 24, borderTopRightRadius: 24, bottom: 0, left: 0, position: 'absolute', top: 0, width: Math.min(360, width * 0.88) },
          panel,
        ]}
      >
        {side === 'bottom' ? <View style={{ alignSelf: 'center', backgroundColor: p.surface3, borderRadius: 2, height: 4, marginTop: 10, width: 40 }} /> : null}
        <ScrollView contentContainerStyle={{ gap: 16, padding: 20, paddingBottom: insets.bottom + 24, paddingTop: side === 'left' ? insets.top + 20 : 12 }}>
          {children}
        </ScrollView>
      </Animated.View>
    </Modal>
  )
}
