import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, AppState, Pressable, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { Avatar } from '@/components/brand'
import { Button, Screen, Txt } from '@/components/ui'
import { fonts } from '@/constants/theme'
import { ActivityScreen } from '@/features/activity/activity-screen'
import { hasPin } from '@/features/lock/pin'
import { LockScreen } from '@/features/lock/lock-screen'
import { SettingsDrawer } from '@/features/main/settings-drawer'
import { BiometricStep, ConnectStep, CreatePinStep, ProfileStep, WelcomeStep } from '@/features/onboarding/onboarding-steps'
import { usePalette, usePrefs } from '@/features/prefs/prefs-provider'
import { SpeakScreen } from '@/features/speak/speak-screen'
import { useVault } from '@/features/vault/use-vault'
import { FundsStep, RulesStep, VaultScreen } from '@/features/vault/vault-screen'
import { formatError } from '@/utils/format-error'

type Tab = 'speak' | 'activity' | 'vault'
const TABS: { id: Tab; label: string }[] = [
  { id: 'speak', label: 'Speak' },
  { id: 'activity', label: 'Activity' },
  { id: 'vault', label: 'Vault' },
]
const RELOCK_AFTER_MS = 60_000

function TopBar({ tab, onTab, onProfile }: { tab: Tab; onTab: (t: Tab) => void; onProfile: () => void }) {
  const p = usePalette()
  const { prefs } = usePrefs()
  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10, paddingBottom: 8, paddingHorizontal: 20, paddingTop: 8 }}>
      <Pressable accessibilityLabel="Profile and settings" accessibilityRole="button" onPress={onProfile}>
        <Avatar color={prefs.avatar} size={40} username={prefs.username} />
      </Pressable>
      {TABS.map((t) => {
        const on = t.id === tab
        return (
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} key={t.id} onPress={() => onTab(t.id)}>
            <View style={{ backgroundColor: on ? p.primary : p.surface2, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 }}>
              <Txt style={{ color: on ? p.primaryText : p.textMuted, fontFamily: fonts.semibold, fontSize: 15 }}>{t.label}</Txt>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Decides what to show: onboarding → lock → setup → the three sections. */
export function AppGate() {
  const p = usePalette()
  const { prefs, ready, set } = usePrefs()
  const { account } = useMobileWallet()
  const owner = account?.address.toBase58()
  const vault = useVault(owner)
  const [unlocked, setUnlocked] = useState(false)
  const [tab, setTab] = useState<Tab>('speak')
  const [drawer, setDrawer] = useState(false)
  const backgroundedAt = useRef<number | null>(null)

  // If the keystore lost the PIN (e.g. restored from backup), ask for a new one instead of locking forever.
  useEffect(() => {
    if (ready && prefs.pinDone) void hasPin().then((ok) => !ok && set({ pinDone: false }))
  }, [ready, prefs.pinDone, set])

  // Re-lock after a minute in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') backgroundedAt.current = Date.now()
      if (s === 'active' && backgroundedAt.current && Date.now() - backgroundedAt.current > RELOCK_AFTER_MS) setUnlocked(false)
    })
    return () => sub.remove()
  }, [])

  if (!ready) return <View style={{ backgroundColor: p.bg, flex: 1 }} />
  if (!prefs.welcomed) return <WelcomeStep />
  if (!prefs.profileDone) return <ProfileStep />
  if (!prefs.pinDone) return <CreatePinStep onCreated={() => setUnlocked(true)} />
  if (!unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />
  if (!prefs.biometricAsked) return <BiometricStep />
  if (!account || !owner) return <ConnectStep />

  if (vault.isPending)
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: 12, paddingTop: 120 }}>
          <ActivityIndicator color={p.primary} />
          <Txt variant="muted">Reading your vault from Solana…</Txt>
        </View>
      </Screen>
    )
  if (vault.isError)
    return (
      <Screen>
        <Txt variant="h2">Couldn&apos;t reach SpeakPay</Txt>
        <Txt variant="muted">{formatError(vault.error)}</Txt>
        <Button onPress={() => void vault.refetch()} title="Try again" />
      </Screen>
    )

  const data = vault.data
  if (!data.vault)
    return (
      <Screen>
        <RulesStep />
      </Screen>
    )
  if (data.vault_funds_lamports === 0 && data.vault.tx_count === 0)
    return (
      <Screen>
        <FundsStep />
      </Screen>
    )

  const refresh = () => void vault.refetch()
  return (
    <>
      <Screen header={<TopBar onProfile={() => setDrawer(true)} onTab={setTab} tab={tab} />}>
        <Animated.View entering={FadeIn.duration(220)} key={tab} style={{ gap: 16 }}>
          {tab === 'speak' ? (
            <SpeakScreen data={data} onGoToVault={() => setTab('vault')} onRun={refresh} owner={owner} />
          ) : tab === 'activity' ? (
            <ActivityScreen vaultPda={data.vault.vault_pda} />
          ) : (
            <VaultScreen data={data} onChanged={refresh} />
          )}
        </Animated.View>
      </Screen>
      <SettingsDrawer onClose={() => setDrawer(false)} onLock={() => setUnlocked(false)} open={drawer} />
    </>
  )
}
