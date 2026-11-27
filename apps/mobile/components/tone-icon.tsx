import { Check, ShieldX, TriangleAlert } from 'lucide-react-native'
import { Text, View } from 'react-native'
import { IceCube } from '@/components/brand'
import type { Tone } from '@/features/shared/describe-run'
import { usePalette } from '@/features/prefs/prefs-provider'

/** One tinted circle with a bare, bold glyph inside (no circle-in-circle). */
export function ToneIcon({ tone, size = 44 }: { tone: Tone; size?: number }) {
  const p = usePalette()
  const g = Math.round(size * 0.56)
  const [bg, fg] =
    tone === 'paid' ? [p.paidSoft, p.paid] : tone === 'blocked' ? [p.blockedSoft, p.blocked] : tone === 'frozen' ? [p.frozenSoft, p.frozen] : [p.surface2, p.textMuted]
  return (
    <View style={{ alignItems: 'center', backgroundColor: bg, borderRadius: size / 2, height: size, justifyContent: 'center', width: size }}>
      {tone === 'paid' ? (
        <Check color={fg} size={g} strokeWidth={2.75} />
      ) : tone === 'blocked' ? (
        <ShieldX color={fg} size={g} strokeWidth={2.25} />
      ) : tone === 'frozen' ? (
        <IceCube color={fg} size={g} />
      ) : (
        <TriangleAlert color={fg} size={g} strokeWidth={2.25} />
      )}
    </View>
  )
}

export function TonePill({ tone, label }: { tone: Tone; label: string }) {
  const p = usePalette()
  const [bg, fg] =
    tone === 'paid' ? [p.paidSoft, p.paid] : tone === 'blocked' ? [p.blockedSoft, p.blocked] : tone === 'frozen' ? [p.frozenSoft, p.frozen] : [p.surface2, p.textMuted]
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
      <Text style={{ color: fg, fontFamily: 'Figtree_700Bold', fontSize: 13 }}>{label}</Text>
    </View>
  )
}
