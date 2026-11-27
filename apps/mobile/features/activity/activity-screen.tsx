import { useState } from 'react'
import { Pressable, View } from 'react-native'
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated'
import { ToneIcon } from '@/components/tone-icon'
import { Card, ErrorText, Row, Txt } from '@/components/ui'
import { fonts } from '@/constants/theme'
import { receiptFromRow, type Receipt } from '@/features/activity/receipt'
import { ReceiptSheet } from '@/features/activity/receipt-sheet'
import { useAuditFeed } from '@/features/activity/use-audit-feed'
import { usePalette } from '@/features/prefs/prefs-provider'
import { describeRun, formatSol } from '@/features/shared/describe-run'

function timeLabel(iso: string) {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

// Activity: every payment, block and freeze in plain language. Tap a row for its receipt.
export function ActivityScreen({ vaultPda }: { vaultPda: string }) {
  const p = usePalette()
  const feed = useAuditFeed(vaultPda)
  const [open, setOpen] = useState<Receipt | null>(null)

  return (
    <>
      <View style={{ gap: 4 }}>
        <Txt variant="h1">Activity</Txt>
        <Txt variant="muted">Every payment, blocked page and freeze. Tap one for its receipt.</Txt>
      </View>
      <Row>
        <Txt style={{ color: feed.live ? p.paid : p.textMuted, fontFamily: fonts.semibold }} variant="small">
          {feed.live ? '● Live' : '○ Connecting…'}
        </Txt>
        <Txt variant="small">{feed.rows.length ? `${feed.rows.length} recent` : ''}</Txt>
      </Row>
      {feed.error ? <ErrorText>{feed.error}</ErrorText> : null}
      {feed.rows.length === 0 && !feed.error ? (
        <Card>
          <Txt variant="muted">No activity yet. Hold to speak on the Speak tab to make your first payment.</Txt>
        </Card>
      ) : (
        <Card style={{ gap: 0, padding: 8 }}>
          {feed.rows.map((r, i) => {
            const d = describeRun(r)
            return (
              <Animated.View entering={FadeInDown.delay(Math.min(i, 8) * 30).duration(220)} key={r.id} layout={LinearTransition}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setOpen(receiptFromRow(r))}
                  style={({ pressed }) => ({ alignItems: 'center', backgroundColor: pressed ? p.surface2 : 'transparent', borderRadius: 14, flexDirection: 'row', gap: 12, padding: 10 })}
                >
                  <ToneIcon tone={d.tone} />
                  <View style={{ flex: 1 }}>
                    <Txt numberOfLines={1} style={{ fontFamily: fonts.bold }}>
                      {d.title}
                    </Txt>
                    <Txt numberOfLines={2} variant="small">
                      {d.detail} · {timeLabel(r.created_at)}
                    </Txt>
                  </View>
                  {r.amount_lamports !== null ? (
                    <Txt style={{ color: d.tone === 'paid' ? p.text : p.textMuted, fontFamily: fonts.bold }}>
                      {d.tone === 'paid' ? `−${formatSol(r.amount_lamports)}` : formatSol(r.amount_lamports)}
                    </Txt>
                  ) : null}
                </Pressable>
              </Animated.View>
            )
          })}
        </Card>
      )}
      <Txt variant="small">Voice transcripts are stored publicly for this Devnet demo.</Txt>
      <ReceiptSheet onClose={() => setOpen(null)} receipt={open} />
    </>
  )
}
