import { DEMO_POLICY, explorerTxUrl, lamportsToSol, type SimulateRogueResponse } from '@speakpay/shared'
import { useMutation } from '@tanstack/react-query'
import * as WebBrowser from 'expo-web-browser'
import { Pressable, Text, View } from 'react-native'
import { AppButton } from '@/components/app-button'
import { appStyles } from '@/constants/app-styles'
import { apiPost } from '@/features/api/api-client'
import { playTts } from '@/features/console/play-tts'
import { StatusChip } from '@/features/console/status-chip'
import { ellipsify } from '@/utils/ellipsify'
import { formatError } from '@/utils/format-error'

// T1 — Layer 2 proof: the delegate key signs directly, bypassing voice, LLM and prechecks.
export function RoguePanel({ vaultPda }: { vaultPda: string }) {
  const rogue = useMutation({
    mutationFn: (amount: number) =>
      apiPost<SimulateRogueResponse>('/api/simulate-rogue', { vault_pda: vaultPda, amount_lamports: amount, client: 'mobile' }),
    onSuccess: (r) => void playTts(r.tts_audio_base64),
  })
  const r = rogue.data
  return (
    <View style={appStyles.card}>
      <Text style={appStyles.label}>Security test · simulate a compromised agent</Text>
      <AppButton
        busy={rogue.isPending && rogue.variables === DEMO_POLICY.roguePayLamports}
        disabled={rogue.isPending}
        onPress={() => rogue.mutate(DEMO_POLICY.roguePayLamports)}
        title={`Simulate rogue agent: pay ${lamportsToSol(DEMO_POLICY.roguePayLamports)} SOL`}
        variant="danger"
      />
      <AppButton
        busy={rogue.isPending && rogue.variables === DEMO_POLICY.rogueCompliantLamports}
        disabled={rogue.isPending}
        onPress={() => rogue.mutate(DEMO_POLICY.rogueCompliantLamports)}
        title={`Simulate rogue agent: pay ${lamportsToSol(DEMO_POLICY.rogueCompliantLamports)} SOL`}
        variant="secondary"
      />
      {rogue.isError ? <Text style={appStyles.textDanger}>{formatError(rogue.error)}</Text> : null}
      {r ? (
        <View style={appStyles.stack}>
          <StatusChip status={r.status} />
          <Text style={appStyles.text}>{r.speech_text}</Text>
          {r.error_code ? (
            <Text style={appStyles.mono}>
              {r.error_code}
              {r.error_number ? ` (${r.error_number}, 0x${r.error_number.toString(16)})` : ''}
            </Text>
          ) : null}
          {r.tx_signature ? (
            <Pressable onPress={() => void WebBrowser.openBrowserAsync(explorerTxUrl(r.tx_signature!))}>
              <Text style={appStyles.textSuccess}>Tx {ellipsify(r.tx_signature, 8)} — view on Explorer</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
