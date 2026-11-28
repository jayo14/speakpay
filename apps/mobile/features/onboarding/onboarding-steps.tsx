import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { Fingerprint, Wallet } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { Avatar, LogoMark, SetupDots } from '@/components/brand'
import { Button, ErrorText, Row, Screen, Txt } from '@/components/ui'
import { AVATAR_COLORS, fonts, radius } from '@/constants/theme'
import { biometricsAvailable, biometricUnlock } from '@/features/lock/biometrics'
import { savePin } from '@/features/lock/pin'
import { PinPad } from '@/features/lock/pin-pad'
import { usePalette, usePrefs } from '@/features/prefs/prefs-provider'
import { formatError } from '@/utils/format-error'

// First run: Welcome → Profile → PIN → Fingerprint → Connect → Rules → Funds (6 dotted steps after Welcome).
export const SETUP_TOTAL = 6
const USERNAME_RE = /^[a-z0-9_]{3,20}$/

function StepHeader({ step, onSkip }: { step: number; onSkip?: () => void }) {
  return (
    <Row style={{ minHeight: 32 }}>
      <View style={{ width: 48 }} />
      <SetupDots step={step} total={SETUP_TOTAL} />
      <View style={{ alignItems: 'flex-end', width: 48 }}>
        {onSkip ? (
          <Pressable accessibilityRole="button" hitSlop={12} onPress={onSkip}>
            <Txt style={{ fontFamily: fonts.semibold }}>Skip</Txt>
          </Pressable>
        ) : null}
      </View>
    </Row>
  )
}

export function WelcomeStep() {
  const p = usePalette()
  const { set } = usePrefs()
  const breathe = useSharedValue(1)
  useEffect(() => {
    breathe.set(withRepeat(withTiming(1.06, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true))
  }, [breathe])
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value }] }))

  return (
    <Screen scroll={false}>
      <View style={{ alignItems: 'center', gap: 28, justifyContent: 'center', minHeight: 560 }}>
        <Animated.View style={[{ alignItems: 'center', backgroundColor: p.primarySoft, borderRadius: 72, height: 144, justifyContent: 'center', width: 144 }, ring]}>
          <LogoMark size={84} />
        </Animated.View>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Txt style={{ fontSize: 36, lineHeight: 42, textAlign: 'center' }} variant="h1">
            Speak to pay.
          </Txt>
          <Txt style={{ maxWidth: 300, textAlign: 'center' }} variant="muted">
            Pay by voice, inside spending limits no AI can break.
          </Txt>
        </View>
      </View>
      <Button onPress={() => set({ welcomed: true })} title="Get started" />
      <Txt style={{ textAlign: 'center' }} variant="small">
        Solana Devnet · no real funds
      </Txt>
    </Screen>
  )
}

export function ProfileStep() {
  const p = usePalette()
  const { prefs, set } = usePrefs()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(prefs.avatar)
  const ok = USERNAME_RE.test(name)

  return (
    <Screen>
      <StepHeader onSkip={() => set({ avatar, profileDone: true })} step={1} />
      <View style={{ gap: 6 }}>
        <Txt variant="h1">Choose a username</Txt>
        <Txt variant="muted">It&apos;s how SpeakPay greets you. No real name or email needed.</Txt>
      </View>
      <View style={{ alignItems: 'center', gap: 18, paddingVertical: 8 }}>
        <Animated.View entering={FadeIn.duration(200)} key={`${avatar}:${name.charAt(0)}`}>
          <Avatar color={avatar} size={96} username={name} />
        </Animated.View>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 12 }}>
          {AVATAR_COLORS.map((c) => (
            <Pressable
              accessibilityLabel={c.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: avatar === c.id }}
              key={c.id}
              onPress={() => setAvatar(c.id)}
              style={{ borderColor: avatar === c.id ? p.primary : 'transparent', borderRadius: 24, borderWidth: 2, padding: 2 }}
            >
              <View style={{ backgroundColor: c.bg, borderRadius: 18, height: 36, width: 36 }} />
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Txt variant="label">Username</Txt>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          onChangeText={(t) => setName(t.toLowerCase().replace(/^@/, '').replace(/\s/g, ''))}
          placeholder="@username"
          placeholderTextColor={p.textMuted}
          style={{
            backgroundColor: p.surface2,
            borderColor: name && !ok ? p.blocked : p.line,
            borderRadius: radius.field,
            borderWidth: 1,
            color: p.text,
            fontFamily: fonts.regular,
            fontSize: 16,
            minHeight: 52,
            paddingHorizontal: 16,
          }}
          value={name}
        />
        <Txt variant="small">3–20 lowercase letters, numbers or _</Txt>
      </View>
      <Button disabled={!ok} onPress={() => set({ avatar, profileDone: true, username: name })} title="Continue" />
    </Screen>
  )
}

export function CreatePinStep({ onCreated }: { onCreated: () => void }) {
  const { set } = usePrefs()
  const [first, setFirst] = useState<string | null>(null)
  const [errorKey, setErrorKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Screen>
      <StepHeader step={2} />
      <View style={{ gap: 6 }}>
        <Txt variant="h1">{first ? 'Confirm your PIN' : 'Create a 6-digit PIN'}</Txt>
        <Txt variant="muted">{first ? 'Enter it once more.' : 'You’ll use it to open SpeakPay on this phone.'}</Txt>
      </View>
      <View style={{ paddingTop: 24 }}>
        <PinPad
          disabled={busy}
          errorKey={errorKey}
          key={first ? 'confirm' : 'create'}
          onComplete={async (pin) => {
            if (!first) return setFirst(pin)
            if (pin !== first) {
              setError('Those PINs didn’t match. Try again.')
              setFirst(null)
              return setErrorKey((k) => k + 1)
            }
            setBusy(true)
            try {
              await savePin(pin)
              set({ pinDone: true })
              onCreated()
            } catch (e) {
              setError(formatError(e))
              setFirst(null)
            } finally {
              setBusy(false)
            }
          }}
        />
      </View>
      {error ? <ErrorText>{error}</ErrorText> : null}
    </Screen>
  )
}

export function BiometricStep() {
  const p = usePalette()
  const { set } = usePrefs()
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    void biometricsAvailable().then((ok) => {
      setAvailable(ok)
      // No sensor or nothing enrolled: this optional step skips itself.
      if (!ok) set({ biometricAsked: true })
    })
  }, [set])

  if (available === null) return <Screen>{null}</Screen>

  return (
    <Screen>
      <StepHeader onSkip={() => set({ biometric: false, biometricAsked: true })} step={3} />
      <View style={{ alignItems: 'center', gap: 24, paddingVertical: 40 }}>
        <View style={{ alignItems: 'center', backgroundColor: p.primarySoft, borderRadius: 64, height: 128, justifyContent: 'center', width: 128 }}>
          <Fingerprint color={p.primary} size={64} strokeWidth={1.5} />
        </View>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Txt style={{ textAlign: 'center' }} variant="h1">
            Unlock with your fingerprint
          </Txt>
          <Txt style={{ textAlign: 'center' }} variant="muted">
            Optional. Your PIN always works too.
          </Txt>
        </View>
      </View>
      <Button
        onPress={async () => {
          const ok = await biometricUnlock('Turn on fingerprint unlock')
          set({ biometric: ok, biometricAsked: true })
        }}
        title="Turn on fingerprint"
      />
      <Button onPress={() => set({ biometric: false, biometricAsked: true })} title="Not now" variant="secondary" />
    </Screen>
  )
}

export function ConnectStep() {
  const p = usePalette()
  const { connect } = useMobileWallet()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Screen>
      <StepHeader step={4} />
      <View style={{ gap: 6 }}>
        <Txt variant="h1">Connect your wallet</Txt>
        <Txt variant="muted">Your wallet is your account. You approve every change to your vault in it.</Txt>
      </View>
      <View style={{ alignItems: 'center', paddingVertical: 32 }}>
        <View style={{ alignItems: 'center', backgroundColor: p.primarySoft, borderRadius: 64, height: 128, justifyContent: 'center', width: 128 }}>
          <Wallet color={p.primary} size={60} strokeWidth={1.5} />
        </View>
      </View>
      <Button
        busy={busy}
        onPress={async () => {
          setBusy(true)
          setError(null)
          try {
            await connect()
          } catch (e) {
            setError(formatError(e))
          } finally {
            setBusy(false)
          }
        }}
        title="Connect Phantom or Solflare"
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Txt variant="small">Set your wallet to Devnet first (Phantom: Settings → Developer Settings → Testnet Mode). Need test SOL? faucet.solana.com</Txt>
    </Screen>
  )
}
