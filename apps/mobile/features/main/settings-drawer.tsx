import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import * as WebBrowser from 'expo-web-browser'
import { CircleHelp, Fingerprint, Info, Lock, LogOut, MonitorSmartphone, Moon, Timer, X } from 'lucide-react-native'
import { PropsWithChildren, useEffect, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { Avatar } from '@/components/brand'
import { Sheet } from '@/components/sheet'
import { Chip, Divider, Row, Toggle, Txt } from '@/components/ui'
import { AVATAR_COLORS, fonts, radius } from '@/constants/theme'
import { biometricsAvailable, biometricUnlock } from '@/features/lock/biometrics'
import { usePalette, usePrefs } from '@/features/prefs/prefs-provider'
import { ellipsify } from '@/utils/ellipsify'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={{ gap: 12 }}>
      <Divider />
      <Txt variant="label">{title}</Txt>
      {children}
    </View>
  )
}

function Line({ icon, label, right, onPress, danger }: { icon: React.ReactNode; label: string; right?: React.ReactNode; onPress?: () => void; danger?: boolean }) {
  const p = usePalette()
  const body = (
    <Row style={{ minHeight: 44 }}>
      <View style={{ alignItems: 'center', flex: 1, flexDirection: 'row', gap: 12 }}>
        {icon}
        <Txt style={{ color: danger ? p.blocked : p.text, flexShrink: 1 }}>{label}</Txt>
      </View>
      {right}
    </Row>
  )
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    body
  )
}

// Profile & settings. Plain rows; only the wallet sits in a card. Stored on this phone only.
export function SettingsDrawer({ open, onClose, onLock }: { open: boolean; onClose: () => void; onLock: () => void }) {
  const p = usePalette()
  const { prefs, set } = usePrefs()
  const { account, disconnect } = useMobileWallet()
  const [draft, setDraft] = useState(prefs.username)
  const [bioAvailable, setBioAvailable] = useState(false)
  const draftOk = draft === '' || USERNAME_RE.test(draft)
  const icon = (I: typeof Moon) => <I color={p.text} size={20} strokeWidth={1.75} />

  useEffect(() => {
    void biometricsAvailable().then(setBioAvailable)
  }, [])

  return (
    <Sheet onClose={onClose} open={open} side="left">
      <Row>
        <Avatar color={prefs.avatar} size={64} username={prefs.username} />
        <Pressable accessibilityLabel="Close settings" onPress={onClose} style={{ alignItems: 'center', backgroundColor: p.surface2, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 }}>
          <X color={p.text} size={18} strokeWidth={1.75} />
        </Pressable>
      </Row>
      <View>
        <Txt style={{ fontSize: 26 }} variant="h1">
          {prefs.username ? `@${prefs.username}` : 'Your profile'}
        </Txt>
        {account ? <Txt variant="mono">{ellipsify(account.address.toBase58(), 6)}</Txt> : null}
      </View>

      <Section title="Profile">
        <Txt>Username</Txt>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          onBlur={() => draftOk && set({ username: draft })}
          onChangeText={(t) => setDraft(t.toLowerCase().replace(/^@/, '').replace(/\s/g, ''))}
          onSubmitEditing={() => draftOk && set({ username: draft })}
          placeholder="@username"
          placeholderTextColor={p.textMuted}
          style={{ backgroundColor: p.surface2, borderColor: draftOk ? p.line : p.blocked, borderRadius: radius.field, borderWidth: 1, color: p.text, fontFamily: fonts.regular, fontSize: 16, minHeight: 52, paddingHorizontal: 16 }}
          value={draft}
        />
        <Txt>Avatar colour</Txt>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {AVATAR_COLORS.map((c) => (
            <Pressable
              accessibilityLabel={c.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: prefs.avatar === c.id }}
              key={c.id}
              onPress={() => set({ avatar: c.id })}
              style={{ borderColor: prefs.avatar === c.id ? p.primary : 'transparent', borderRadius: 20, borderWidth: 2, padding: 2 }}
            >
              <View style={{ backgroundColor: c.bg, borderRadius: 15, height: 30, width: 30 }} />
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Payments">
        <Line icon={icon(Timer)} label="Cancel window before paying" />
        <View style={{ flexDirection: 'row', gap: 8, paddingLeft: 32 }}>
          {['3', '5', '10'].map((v) => (
            <Chip active={prefs.cancelWindow === v} disabled key={v} label={`${v}s`} onPress={() => set({ cancelWindow: v })} />
          ))}
        </View>
        <Txt style={{ paddingLeft: 32 }} variant="small">
          Coming in the next update — it needs a small server change first.
        </Txt>
      </Section>

      <Section title="Security">
        {bioAvailable ? (
          <Line
            icon={icon(Fingerprint)}
            label="Unlock with fingerprint"
            right={
              <Toggle
                label="Unlock with fingerprint"
                on={prefs.biometric}
                onChange={async (v) => {
                  if (!v) return set({ biometric: false })
                  if (await biometricUnlock('Turn on fingerprint unlock')) set({ biometric: true })
                }}
              />
            }
          />
        ) : null}
        <Line
          icon={icon(Lock)}
          label="Lock now"
          onPress={() => {
            onClose()
            onLock()
          }}
        />
      </Section>

      <Section title="Appearance">
        <Line
          icon={icon(MonitorSmartphone)}
          label="Match my device"
          right={<Toggle label="Match my device" on={prefs.theme === 'system'} onChange={(v) => set({ theme: v ? 'system' : 'light' })} />}
        />
        <Line
          icon={icon(Moon)}
          label="Dark mode"
          right={<Toggle disabled={prefs.theme === 'system'} label="Dark mode" on={prefs.theme === 'dark'} onChange={(v) => set({ theme: v ? 'dark' : 'light' })} />}
        />
      </Section>

      {account ? (
        <Section title="Wallet">
          <View style={{ backgroundColor: p.surface, borderColor: p.line, borderRadius: radius.card, borderWidth: 1, paddingHorizontal: 16 }}>
            <Line icon={icon(Info)} label="Connected wallet" right={<Txt variant="mono">{ellipsify(account.address.toBase58(), 4)}</Txt>} />
            <Divider />
            <Line
              danger
              icon={<LogOut color={p.blocked} size={20} strokeWidth={1.75} />}
              label="Disconnect"
              onPress={() => {
                onClose()
                void disconnect()
              }}
            />
          </View>
        </Section>
      ) : null}

      <Section title="Support">
        <Line icon={icon(CircleHelp)} label="Help & support" onPress={() => void WebBrowser.openBrowserAsync('https://github.com/jayo14/speakpay#readme')} />
        <Line icon={icon(Info)} label="About SpeakPay" right={<Txt variant="small">Devnet · no real funds</Txt>} />
      </Section>
    </Sheet>
  )
}
