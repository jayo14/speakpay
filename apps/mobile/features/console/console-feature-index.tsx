import { explorerTxUrl, lamportsToSol, type VoiceCommandResponse } from '@speakpay/shared'
import { useMutation } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import * as WebBrowser from 'expo-web-browser'
import { useCallback } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { AppButton } from '@/components/app-button'
import { appStyles, colors } from '@/constants/app-styles'
import { apiPostAudio } from '@/features/api/api-client'
import { playTts } from '@/features/console/play-tts'
import { StatusChip } from '@/features/console/status-chip'
import { useHoldToTalk } from '@/features/console/use-hold-to-talk'
import { useOwnerAction, useVault } from '@/features/vault/use-vault'
import { ellipsify } from '@/utils/ellipsify'
import { formatError } from '@/utils/format-error'

// Voice console (PRD §8.2 Screen 2): hold to talk → /api/voice-command → verdict + TTS.
export function ConsoleFeatureIndex() {
  const { account } = useMobileWallet()
  const owner = account?.address.toBase58()
  const vault = useVault(owner).data?.vault ?? null
  const freeze = useOwnerAction()

  const command = useMutation({
    mutationFn: (uri: string) =>
      apiPostAudio<VoiceCommandResponse>('/api/voice-command', uri, {
        vault_pda: vault!.vault_pda,
        owner_pubkey: owner!,
        client: 'mobile',
      }),
    onSuccess: (r) => void playTts(r.tts_audio_base64),
  })
  const onRecorded = useCallback((uri: string) => command.mutate(uri), [command])
  const talk = useHoldToTalk(onRecorded)

  if (!account) return <Text style={appStyles.textMuted}>Connect a wallet on the Vault tab.</Text>
  if (!vault) return <Text style={appStyles.textMuted}>Create and fund your vault on the Vault tab first.</Text>

  const r = command.data
  const scraped = r?.scraped_json as { vendor_name?: string; plan_name?: string; price_sol?: number } | null | undefined

  return (
    <View style={appStyles.stack}>
      <Pressable
        accessibilityLabel="Hold to talk"
        accessibilityRole="button"
        disabled={command.isPending}
        onPressIn={() => void talk.start()}
        onPressOut={() => void talk.stop()}
        style={[styles.mic, talk.recording && styles.micActive, command.isPending && { opacity: 0.5 }]}
      >
        <Text style={[styles.micLabel, talk.recording && { color: colors.bg }]}>
          {talk.recording ? 'Listening…' : command.isPending ? 'Working…' : 'Hold to talk'}
        </Text>
      </Pressable>
      {talk.hint ? <Text style={appStyles.textMuted}>{talk.hint}</Text> : null}
      {command.isPending ? (
        <Text style={appStyles.textMuted}>Transcribing → verifying page → checking policy → on-chain</Text>
      ) : null}
      {command.isError ? <Text style={appStyles.textDanger}>{formatError(command.error)}</Text> : null}

      {r ? (
        <View style={appStyles.card}>
          <StatusChip status={r.status} />
          <Text style={appStyles.text}>{r.speech_text}</Text>
          <Text style={appStyles.label}>You said</Text>
          <Text style={appStyles.text}>“{r.transcript}”</Text>
          {scraped?.vendor_name ? (
            <>
              <Text style={appStyles.label}>Live page</Text>
              <Text style={appStyles.text}>
                {scraped.vendor_name} · {scraped.plan_name} · {scraped.price_sol} SOL
              </Text>
            </>
          ) : null}
          {r.amount_lamports !== null ? (
            <Text style={appStyles.mono}>Amount: {lamportsToSol(r.amount_lamports)} SOL</Text>
          ) : null}
          {r.error_code ? <Text style={appStyles.mono}>Code: {r.error_code}{r.error_number ? ` (${r.error_number})` : ''}</Text> : null}
          {r.evidence_hash ? <Text style={appStyles.mono}>Evidence: {ellipsify(r.evidence_hash, 8)}</Text> : null}
          {r.tx_signature ? (
            <Pressable onPress={() => void WebBrowser.openBrowserAsync(explorerTxUrl(r.tx_signature!))}>
              <Text style={appStyles.textSuccess}>Tx {ellipsify(r.tx_signature, 8)} — view on Explorer</Text>
            </Pressable>
          ) : null}
          <Text style={appStyles.textMuted}>
            STT {r.timings_ms.stt}ms · scrape {r.timings_ms.scrape ?? '–'}ms · chain {r.timings_ms.chain ?? '–'}ms · total{' '}
            {r.timings_ms.total}ms
          </Text>
          {r.next_action === 'sign_freeze' ? (
            <AppButton
              busy={freeze.isPending}
              onPress={() => freeze.mutate({ action: 'toggle_freeze', params: { frozen: true } })}
              title="Approve freeze in wallet"
            />
          ) : null}
          {freeze.isSuccess ? <Text style={{ color: colors.frozen }}>Vault frozen on-chain.</Text> : null}
          {freeze.isError ? <Text style={appStyles.textDanger}>{formatError(freeze.error)}</Text> : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  mic: {
    alignItems: 'center',
    aspectRatio: 1,
    borderColor: colors.ink,
    borderWidth: 2,
    justifyContent: 'center',
    marginVertical: 16,
    width: '100%',
  },
  micActive: { backgroundColor: colors.ink },
  micLabel: { color: colors.ink, fontSize: 24, fontWeight: '700' },
})
