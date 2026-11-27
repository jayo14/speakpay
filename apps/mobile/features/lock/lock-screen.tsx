import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { Avatar } from '@/components/brand'
import { ErrorText, Screen, Txt } from '@/components/ui'
import { biometricUnlock } from '@/features/lock/biometrics'
import { checkPin } from '@/features/lock/pin'
import { PinPad } from '@/features/lock/pin-pad'
import { usePrefs } from '@/features/prefs/prefs-provider'

// App lock: fingerprint first (if turned on), PIN always.
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { prefs } = usePrefs()
  const [errorKey, setErrorKey] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const tryBiometric = useCallback(async () => {
    if (await biometricUnlock()) onUnlock()
  }, [onUnlock])

  useEffect(() => {
    if (prefs.biometric) void tryBiometric()
  }, [prefs.biometric, tryBiometric])

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 40 }}>
        <Avatar color={prefs.avatar} size={72} username={prefs.username} />
        <Txt variant="h2">{prefs.username ? `Welcome back, @${prefs.username}` : 'Welcome back'}</Txt>
        <Txt variant="muted">Enter your PIN to open SpeakPay</Txt>
      </View>
      <View style={{ paddingTop: 24 }}>
        <PinPad
          disabled={busy}
          errorKey={errorKey}
          onBiometric={prefs.biometric ? () => void tryBiometric() : undefined}
          onComplete={async (pin) => {
            setBusy(true)
            const r = await checkPin(pin)
            setBusy(false)
            if (r.ok) return onUnlock()
            setErrorKey((k) => k + 1)
            setMessage(
              r.lockedForMs > 0 ? `Too many tries. Wait ${Math.ceil(r.lockedForMs / 1000)} seconds.` : `Wrong PIN. ${r.attemptsLeft} ${r.attemptsLeft === 1 ? 'try' : 'tries'} left.`,
            )
          }}
        />
      </View>
      {message ? (
        <View style={{ alignItems: 'center' }}>
          <ErrorText>{message}</ErrorText>
        </View>
      ) : null}
    </Screen>
  )
}
