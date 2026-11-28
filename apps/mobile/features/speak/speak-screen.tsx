import { lamportsToSol, type AuditFreezeResponse, type VaultReadResponse, type VoiceCommandResponse } from '@speakpay/shared'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { IceCube } from '@/components/brand'
import { ToneIcon, TonePill } from '@/components/tone-icon'
import { Button, Card, ErrorText, Row, Txt } from '@/components/ui'
import { fonts } from '@/constants/theme'
import { receiptFromVoice, type Receipt } from '@/features/activity/receipt'
import { ReceiptSheet } from '@/features/activity/receipt-sheet'
import { apiPost, apiPostAudio } from '@/features/api/api-client'
import { usePalette, usePrefs } from '@/features/prefs/prefs-provider'
import { describeRun, formatSol, type Tone } from '@/features/shared/describe-run'
import { Orb, type OrbState } from '@/features/speak/orb'
import { playTts } from '@/features/speak/play-tts'
import { useHoldToTalk } from '@/features/speak/use-hold-to-talk'
import { useOwnerAction } from '@/features/vault/use-vault'
import { formatError } from '@/utils/format-error'

const RESULT_FLASH_MS = 2600
const TRY = [
  '“Check the Dev3pack merchant page — if the Starter Plan is under 0.05 SOL, pay them.”',
  '“Check the Shady Deals merchant page and pay for the discount plan.”',
  '“Freeze my vault.”',
]

function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function StatusStrip({ data }: { data: VaultReadResponse }) {
  const p = usePalette()
  const now = useNow()
  const v = data.vault!
  const spent = now - v.window_start_ts < 86_400 ? v.daily_spent_lamports : 0
  const cooldownLeft = v.last_tx_ts === 0 ? 0 : Math.max(0, v.last_tx_ts + v.cooldown_secs - now)
  const state: { tone: Tone; label: string } = v.is_frozen
    ? { tone: 'frozen', label: 'Frozen' }
    : data.vault_funds_lamports === 0
      ? { tone: 'blocked', label: 'No funds' }
      : cooldownLeft > 0
        ? { tone: 'neutral', label: `Wait ${cooldownLeft}s` }
        : { tone: 'paid', label: 'Ready' }
  const pct = Math.min(100, (spent / v.daily_cap_lamports) * 100)
  const width = useSharedValue(pct)
  useEffect(() => {
    width.set(withTiming(pct, { duration: 280, easing: Easing.bezier(0.22, 1, 0.36, 1) }))
  }, [pct, width])
  const fill = useAnimatedStyle(() => ({ width: `${width.value}%` }))

  return (
    <Card>
      <Row>
        <View>
          <Txt variant="label">Balance</Txt>
          <Txt variant="num">{formatSol(data.vault_funds_lamports)}</Txt>
        </View>
        <TonePill label={state.label} tone={state.tone} />
      </Row>
      <View style={{ gap: 6 }}>
        <Row>
          <Txt variant="label">Spent today</Txt>
          <Txt variant="label">
            {lamportsToSol(spent)} / {formatSol(v.daily_cap_lamports)}
          </Txt>
        </Row>
        <View style={{ backgroundColor: p.surface3, borderRadius: 3, height: 6, overflow: 'hidden' }}>
          <Animated.View style={[{ backgroundColor: p.primary, borderRadius: 3, height: 6 }, fill]} />
        </View>
      </View>
    </Card>
  )
}

const CAPTION: Record<OrbState, [string, string]> = {
  idle: ['Hold to speak', 'Press and hold, speak, then let go'],
  listening: ['Listening…', "Let go when you're done"],
  working: ['Checking…', 'Transcribing, verifying the page and your limits'],
  paid: ['Paid', 'Inside your limits · receipt saved'],
  blocked: ['Stopped', 'Nothing was sent'],
  frozen: ['Frozen', 'Your agent can no longer spend'],
}

// Speak (home). Same /api/voice-command as the web app.
export function SpeakScreen({ data, owner, onGoToVault, onRun }: { data: VaultReadResponse; owner: string; onGoToVault: () => void; onRun: () => void }) {
  const p = usePalette()
  const { prefs } = usePrefs()
  const vault = data.vault!
  const [flash, setFlash] = useState<Exclude<Tone, 'neutral'> | null>(null)
  const [resultAt, setResultAt] = useState('')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const freezeTx = useOwnerAction()

  // T4: owner signs toggle_freeze(true) via MWA; the server verifies it on-chain and logs FROZEN.
  const freeze = useMutation({
    mutationFn: async (parentRunId: string) => {
      const { signature } = await freezeTx.mutateAsync({ action: 'toggle_freeze', params: { frozen: true } })
      return apiPost<AuditFreezeResponse>('/api/audit/freeze', {
        vault_pda: vault.vault_pda,
        tx_signature: signature,
        client: 'mobile',
        ...(parentRunId ? { parent_run_id: parentRunId } : {}),
      })
    },
    onSuccess: (r) => {
      setFlash('frozen')
      void playTts(r.tts_audio_base64)
    },
  })

  const command = useMutation({
    mutationFn: (uri: string) => apiPostAudio<VoiceCommandResponse>('/api/voice-command', uri, { vault_pda: vault.vault_pda, owner_pubkey: owner, client: 'mobile' }),
    onSuccess: (r) => {
      setResultAt(new Date().toISOString())
      const tone = describeRun({ ...r, kind: 'voice' }).tone
      setFlash(tone === 'neutral' ? null : tone)
      if (flashTimer.current) clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setFlash(null), RESULT_FLASH_MS)
      void playTts(r.tts_audio_base64)
      if (r.next_action === 'sign_freeze') freeze.mutate(r.run_id)
    },
    onSettled: onRun,
  })
  const onRecorded = useCallback((uri: string) => command.mutate(uri), [command])
  const talk = useHoldToTalk(onRecorded)

  const orb: OrbState = talk.recording ? 'listening' : command.isPending ? 'working' : (flash ?? (vault.is_frozen ? 'frozen' : 'idle'))
  const [title, sub] = CAPTION[orb]
  const r = command.data
  const d = r ? describeRun({ ...r, kind: 'voice' }) : null

  return (
    <>
      <View style={{ gap: 4 }}>
        <Txt variant="h1">{prefs.username ? `Hi, @${prefs.username}` : 'Speak to pay'}</Txt>
        <Txt variant="muted">Say what you want to pay for. I check the page and your limits first.</Txt>
      </View>
      <StatusStrip data={data} />
      {data.vault_funds_lamports === 0 ? (
        <Card>
          <Txt>Your vault is empty. Add funds before your first payment.</Txt>
          <Button onPress={onGoToVault} title="Add funds" />
        </Card>
      ) : null}

      <View style={{ alignItems: 'center', paddingTop: 8 }}>
        <Orb disabled={command.isPending} level={talk.level} onPressIn={() => void talk.start()} onPressOut={() => void talk.stop()} state={orb} />
        <Animated.View entering={FadeInDown.duration(200)} key={orb} style={{ alignItems: 'center', gap: 2 }}>
          <Txt style={{ fontFamily: fonts.bold, fontSize: 18 }}>{title}</Txt>
          <Txt variant="muted">{sub}</Txt>
        </Animated.View>
        {talk.hint ? <ErrorText>{talk.hint}</ErrorText> : null}
        {command.isError ? <ErrorText>{formatError(command.error)}</ErrorText> : null}
      </View>

      {r && d ? (
        <Animated.View entering={FadeInDown.duration(280)}>
          <Card>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
              <ToneIcon tone={d.tone} />
              <View style={{ flex: 1 }}>
                <Txt style={{ fontFamily: fonts.bold }}>{d.title}</Txt>
                <Txt variant="small">{d.detail}</Txt>
              </View>
            </View>
            {r.transcript ? <Txt variant="muted">You said “{r.transcript}”</Txt> : null}
            {r.next_action === 'sign_freeze' && !freeze.isSuccess ? (
              <Button busy={freeze.isPending} icon={<IceCube color={p.frozen} size={20} />} onPress={() => freeze.mutate(r.run_id)} title="Approve freeze in wallet" variant="frozen" />
            ) : null}
            {freeze.isSuccess ? <TonePill label={freeze.data.speech_text} tone="frozen" /> : null}
            {freeze.isError ? <ErrorText>{formatError(freeze.error)}</ErrorText> : null}
            <Button onPress={() => setReceipt(receiptFromVoice(r, resultAt))} title="View receipt" variant="secondary" />
          </Card>
        </Animated.View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Txt variant="label">Try saying</Txt>
        {TRY.map((t) => (
          <View key={t} style={{ backgroundColor: p.surface, borderColor: p.line, borderRadius: 14, borderWidth: 1, padding: 14 }}>
            <Txt>{t}</Txt>
          </View>
        ))}
        <Txt variant="small">Limit: up to {formatSol(vault.max_per_tx_lamports)} per payment. Payments on Solana can&apos;t be reversed, so SpeakPay checks first.</Txt>
      </View>
      <ReceiptSheet onClose={() => setReceipt(null)} receipt={receipt} />
    </>
  )
}
