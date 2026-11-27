import { PublicKey } from '@solana/web3.js'
import { DEMO_POLICY, lamportsToSol, solToLamports } from '@speakpay/shared'
import { ChevronDown } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { Button, Chip, ErrorText, Txt } from '@/components/ui'
import { fonts, radius } from '@/constants/theme'
import { usePalette } from '@/features/prefs/prefs-provider'
import { formatSol } from '@/features/shared/describe-run'

export interface Rules {
  maxPerTxLamports: number
  dailyCapLamports: number
  cooldownSecs: number
}

// Same presets as the web app. "Balanced" is the demo policy (PRD §2).
export const PRESETS: { id: string; name: string; rules: Rules }[] = [
  { id: 'careful', name: 'Careful', rules: { maxPerTxLamports: 20_000_000, dailyCapLamports: 50_000_000, cooldownSecs: 60 } },
  {
    id: 'balanced',
    name: 'Balanced',
    rules: { maxPerTxLamports: DEMO_POLICY.maxPerTxLamports, dailyCapLamports: DEMO_POLICY.dailyCapLamports, cooldownSecs: DEMO_POLICY.cooldownSecs },
  },
  { id: 'flexible', name: 'Flexible', rules: { maxPerTxLamports: 100_000_000, dailyCapLamports: 500_000_000, cooldownSecs: 10 } },
]

export const sentence = (r: Rules) => `Up to ${formatSol(r.maxPerTxLamports)} per payment, ${formatSol(r.dailyCapLamports)} a day`
const same = (a: Rules, b: Rules) => a.maxPerTxLamports === b.maxPerTxLamports && a.dailyCapLamports === b.dailyCapLamports && a.cooldownSecs === b.cooldownSecs

function isPubkey(v: string) {
  try {
    return new PublicKey(v).toBase58() === v
  } catch {
    return false
  }
}

function Field({ label, value, onChange, numeric, mono, invalid, placeholder }: { label: string; value: string; onChange: (v: string) => void; numeric?: boolean; mono?: boolean; invalid?: boolean; placeholder?: string }) {
  const p = usePalette()
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Txt variant="label">{label}</Txt>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={p.textMuted}
        style={{
          backgroundColor: p.surface2,
          borderColor: invalid ? p.blocked : p.line,
          borderRadius: radius.field,
          borderWidth: 1,
          color: p.text,
          fontFamily: mono ? 'monospace' : fonts.regular,
          fontSize: mono ? 13 : 16,
          minHeight: 52,
          paddingHorizontal: 14,
        }}
        value={value}
      />
    </View>
  )
}

/** Presets + "Customise" + trusted wallet. Used by setup and by Vault → Edit rules. */
export function RulesEditor({ initial, initialTrusted, submitLabel, busy, onSubmit }: { initial: Rules; initialTrusted: string; submitLabel: string; busy: boolean; onSubmit: (r: Rules, allowlist: string[]) => void }) {
  const p = usePalette()
  const [maxSol, setMaxSol] = useState(String(lamportsToSol(initial.maxPerTxLamports)))
  const [daySol, setDaySol] = useState(String(lamportsToSol(initial.dailyCapLamports)))
  const [wait, setWait] = useState(String(initial.cooldownSecs))
  const [trusted, setTrusted] = useState(initialTrusted)
  const [custom, setCustom] = useState(false)

  const max = Number(maxSol)
  const day = Number(daySol)
  const cd = Number(wait)
  const numbersOk = Number.isFinite(max) && max > 0 && Number.isFinite(day) && day >= max && Number.isInteger(cd) && cd >= 0
  const trustedOk = trusted.trim() === '' || isPubkey(trusted.trim())
  const rules: Rules | null = numbersOk ? { maxPerTxLamports: solToLamports(max), dailyCapLamports: solToLamports(day), cooldownSecs: cd } : null

  return (
    <View style={{ gap: 14 }}>
      {PRESETS.map((pr) => {
        const on = !!rules && same(rules, pr.rules)
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            key={pr.id}
            onPress={() => {
              setMaxSol(String(lamportsToSol(pr.rules.maxPerTxLamports)))
              setDaySol(String(lamportsToSol(pr.rules.dailyCapLamports)))
              setWait(String(pr.rules.cooldownSecs))
            }}
            style={{ backgroundColor: on ? p.primarySoft : p.surface, borderColor: on ? p.primary : p.line, borderRadius: 18, borderWidth: 1.5, gap: 2, padding: 16 }}
          >
            <Txt style={{ fontFamily: fonts.bold }}>{pr.name}</Txt>
            <Txt variant="small">{sentence(pr.rules)}</Txt>
          </Pressable>
        )
      })}

      <Pressable accessibilityRole="button" onPress={() => setCustom((c) => !c)} style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
        <Txt style={{ fontFamily: fonts.semibold }}>Customise</Txt>
        <ChevronDown color={p.text} size={16} style={{ transform: [{ rotate: custom ? '180deg' : '0deg' }] }} />
      </Pressable>
      {custom ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field label="Per payment (SOL)" numeric onChange={setMaxSol} value={maxSol} />
            <Field label="Per day (SOL)" numeric onChange={setDaySol} value={daySol} />
          </View>
          <Field label="Wait between payments (seconds)" numeric onChange={setWait} value={wait} />
          <Txt variant="small">The wait stops a hacked agent from firing many payments in a row, giving you time to freeze.</Txt>
        </Animated.View>
      ) : null}

      <Field invalid={!trustedOk} label="Who can it pay? (optional)" mono onChange={setTrusted} placeholder="Paste a wallet address — empty means anyone" value={trusted} />

      {!numbersOk ? <ErrorText>Per-payment must be above 0 and no more than the daily limit.</ErrorText> : null}
      {!trustedOk ? <ErrorText>That isn&apos;t a valid Solana wallet address.</ErrorText> : null}
      <Button busy={busy} disabled={!rules || !trustedOk} onPress={() => rules && onSubmit(rules, trusted.trim() ? [trusted.trim()] : [])} title={submitLabel} />
    </View>
  )
}

const FUND_CHOICES = [100_000_000, 200_000_000, 500_000_000]

export function FundPicker({ busy, label, onFund }: { busy: boolean; label: string; onFund: (lamports: number) => void }) {
  const [amount, setAmount] = useState<number>(DEMO_POLICY.depositLamports)
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FUND_CHOICES.map((a) => (
          <Chip active={a === amount} key={a} label={formatSol(a)} onPress={() => setAmount(a)} />
        ))}
      </View>
      <Button busy={busy} onPress={() => onFund(amount)} title={`${label} ${formatSol(amount)}`} />
    </View>
  )
}
