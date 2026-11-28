import { DEMO_POLICY, explorerTxUrl, lamportsToSol, type SimulateRogueResponse } from '@speakpay/shared'
import { useMutation } from '@tanstack/react-query'
import * as WebBrowser from 'expo-web-browser'
import { Pressable, View } from 'react-native'
import { ToneIcon } from '@/components/tone-icon'
import { Button, ErrorText, Txt } from '@/components/ui'
import { apiPost } from '@/features/api/api-client'
import { usePalette } from '@/features/prefs/prefs-provider'
import { describeRun } from '@/features/shared/describe-run'
import { playTts } from '@/features/speak/play-tts'
import { ellipsify } from '@/utils/ellipsify'
import { formatError } from '@/utils/format-error'

// T1 — Layer 2 proof: the agent key signs directly, skipping voice, AI and every app check.
export function RoguePanel({ vaultPda, onRun }: { vaultPda: string; onRun: () => void }) {
  const p = usePalette()
  const rogue = useMutation({
    mutationFn: (amount: number) => apiPost<SimulateRogueResponse>('/api/simulate-rogue', { vault_pda: vaultPda, amount_lamports: amount, client: 'mobile' }),
    onSuccess: (r) => void playTts(r.tts_audio_base64),
    onSettled: onRun,
  })
  const r = rogue.data
  const d = r ? describeRun({ ...r, kind: 'rogue', amount_lamports: null, scraped_json: null }) : null

  return (
    <View style={{ gap: 10 }}>
      <Txt variant="h2">Simulate a hacked agent</Txt>
      <Txt variant="muted">Sends a payment straight from the agent key — skipping voice, AI and every app check — so you can see Solana itself refuse it.</Txt>
      <Button
        busy={rogue.isPending && rogue.variables === DEMO_POLICY.roguePayLamports}
        disabled={rogue.isPending}
        onPress={() => rogue.mutate(DEMO_POLICY.roguePayLamports)}
        title={`Hacked agent pays ${lamportsToSol(DEMO_POLICY.roguePayLamports)} SOL`}
        variant="danger"
      />
      <Button
        busy={rogue.isPending && rogue.variables === DEMO_POLICY.rogueCompliantLamports}
        disabled={rogue.isPending}
        onPress={() => rogue.mutate(DEMO_POLICY.rogueCompliantLamports)}
        title={`Hacked agent pays ${lamportsToSol(DEMO_POLICY.rogueCompliantLamports)} SOL`}
        variant="secondary"
      />
      {rogue.isError ? <ErrorText>{formatError(rogue.error)}</ErrorText> : null}
      {r && d ? (
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
          <ToneIcon tone={d.tone} />
          <View style={{ flex: 1 }}>
            <Txt style={{ fontFamily: 'Figtree_700Bold' }}>{d.title}</Txt>
            <Txt variant="small">
              {d.detail}
              {r.error_number ? ` · code ${r.error_number}` : ''}
            </Txt>
            {r.tx_signature ? (
              <Pressable onPress={() => void WebBrowser.openBrowserAsync(explorerTxUrl(r.tx_signature!))}>
                <Txt style={{ color: p.primary, fontFamily: 'Figtree_600SemiBold' }}>See it on Solana Explorer · {ellipsify(r.tx_signature, 6)}</Txt>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  )
}
