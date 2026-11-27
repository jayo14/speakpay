import { explorerTxUrl } from '@speakpay/shared'
import * as WebBrowser from 'expo-web-browser'
import { ChevronDown, ExternalLink } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { Sheet } from '@/components/sheet'
import { ToneIcon } from '@/components/tone-icon'
import { Button, Txt } from '@/components/ui'
import { fonts } from '@/constants/theme'
import type { Receipt } from '@/features/activity/receipt'
import { VerifyBadge } from '@/features/common/verify-badge'
import { usePalette } from '@/features/prefs/prefs-provider'
import { describeRun, formatSol, merchantName } from '@/features/shared/describe-run'
import { ellipsify } from '@/utils/ellipsify'

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <Txt style={{ width: 104 }} variant="muted">
        {k}
      </Txt>
      <Txt style={{ flex: 1 }}>{v}</Txt>
    </View>
  )
}

// Permanent receipt: Solana payments can't be reversed, so this is the proof to keep or show a merchant.
export function ReceiptSheet({ receipt, onClose }: { receipt: Receipt | null; onClose: () => void }) {
  const p = usePalette()
  const [tech, setTech] = useState(false)
  if (!receipt) return <Sheet onClose={onClose} open={false} />
  const d = describeRun(receipt)
  const s = receipt.scraped_json as { plan_name?: unknown; price_sol?: unknown } | null
  const page = [merchantName(receipt.scraped_json), typeof s?.plan_name === 'string' ? s.plan_name : null, typeof s?.price_sol === 'number' ? `${s.price_sol} SOL` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <Sheet onClose={onClose} open>
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
        <ToneIcon size={60} tone={d.tone} />
        <Txt style={{ textAlign: 'center' }} variant="h2">
          {d.title}
        </Txt>
        <Txt style={{ textAlign: 'center' }} variant="muted">
          {d.detail}
        </Txt>
        {receipt.amount_lamports !== null ? <Txt variant="big">{formatSol(receipt.amount_lamports)}</Txt> : null}
        {receipt.status === 'PASSED' && receipt.kind === 'voice' && receipt.id ? <VerifyBadge runId={receipt.id} /> : null}
      </View>
      <View style={{ gap: 10 }}>
        {receipt.transcript ? <KV k="You said" v={`“${receipt.transcript}”`} /> : null}
        {page ? <KV k="Page showed" v={page} /> : null}
        {receipt.recipient_pubkey ? <KV k="Paid to" v={ellipsify(receipt.recipient_pubkey, 6)} /> : null}
        <KV k="When" v={new Date(receipt.created_at).toLocaleString()} />
        <KV k="Network" v="Solana Devnet" />
      </View>
      {receipt.tx_signature ? (
        <Button
          icon={<ExternalLink color={p.text} size={16} strokeWidth={1.75} />}
          onPress={() => void WebBrowser.openBrowserAsync(explorerTxUrl(receipt.tx_signature!))}
          title="View on Solana Explorer"
          variant="secondary"
        />
      ) : null}
      <Pressable accessibilityRole="button" onPress={() => setTech((t) => !t)} style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
        <Txt style={{ fontFamily: fonts.semibold }}>Technical details</Txt>
        <ChevronDown color={p.text} size={16} style={{ transform: [{ rotate: tech ? '180deg' : '0deg' }] }} />
      </Pressable>
      {tech ? (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 8 }}>
          <Txt variant="mono">status {receipt.status}</Txt>
          {receipt.error_code ? <Txt variant="mono">code {receipt.error_code}{receipt.error_number ? ` (${receipt.error_number})` : ''}</Txt> : null}
          {receipt.evidence_hash ? <Txt variant="mono">evidence {receipt.evidence_hash}</Txt> : null}
          {receipt.tx_signature ? <Txt variant="mono">signature {receipt.tx_signature}</Txt> : null}
          {receipt.timings ? (
            <Txt variant="mono">
              voice {receipt.timings.stt}ms · page {receipt.timings.scrape ?? '–'}ms · chain {receipt.timings.chain ?? '–'}ms · total {receipt.timings.total}ms
            </Txt>
          ) : null}
          {receipt.id ? <Txt variant="mono">run {receipt.id}</Txt> : null}
        </Animated.View>
      ) : null}
    </Sheet>
  )
}
