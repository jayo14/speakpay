import { explorerAddressUrl, explorerTxUrl, type VaultReadResponse } from '@speakpay/shared'
import * as WebBrowser from 'expo-web-browser'
import { ArrowUpFromLine, ChevronDown, FlaskConical, Lock } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { IceCube, SetupDots } from '@/components/brand'
import { TonePill } from '@/components/tone-icon'
import { Button, Card, ErrorText, Row, Txt } from '@/components/ui'
import { AppConfig } from '@/constants/app-config'
import { fonts } from '@/constants/theme'
import { SETUP_TOTAL } from '@/features/onboarding/onboarding-steps'
import { usePalette } from '@/features/prefs/prefs-provider'
import { formatSol } from '@/features/shared/describe-run'
import { ReadinessCard } from '@/features/vault/readiness-card'
import { RoguePanel } from '@/features/vault/rogue-panel'
import { FundPicker, PRESETS, RulesEditor, sentence, type Rules } from '@/features/vault/rules-editor'
import { useOwnerAction } from '@/features/vault/use-vault'
import { ellipsify } from '@/utils/ellipsify'
import { formatError } from '@/utils/format-error'

function ActionResult({ action }: { action: ReturnType<typeof useOwnerAction> }) {
  const p = usePalette()
  return (
    <>
      {action.isError ? <ErrorText>{formatError(action.error)}</ErrorText> : null}
      {action.data?.signature ? (
        <Pressable onPress={() => void WebBrowser.openBrowserAsync(explorerTxUrl(action.data.signature))}>
          <Txt style={{ color: p.primary, fontFamily: fonts.semibold }}>Confirmed on Solana · {ellipsify(action.data.signature, 6)}</Txt>
        </Pressable>
      ) : null}
    </>
  )
}

/** Setup step 5: spending rules. */
export function RulesStep() {
  const action = useOwnerAction()
  return (
    <>
      <SetupDots step={5} total={SETUP_TOTAL} />
      <View style={{ gap: 6 }}>
        <Txt variant="h1">Set your spending rules</Txt>
        <Txt variant="muted">Solana enforces these limits — not the AI. You can change them any time.</Txt>
      </View>
      <RulesEditor
        busy={action.isPending}
        initial={PRESETS[1]!.rules}
        initialTrusted={AppConfig.merchantCleanWallet}
        onSubmit={(r, allowlist) =>
          action.mutate({ action: 'init', params: { max_per_tx_lamports: r.maxPerTxLamports, daily_cap_lamports: r.dailyCapLamports, cooldown_secs: r.cooldownSecs, allowlist } })
        }
        submitLabel="Create my vault"
      />
      <ActionResult action={action} />
    </>
  )
}

/** Setup step 6: first deposit. */
export function FundsStep() {
  const action = useOwnerAction()
  return (
    <>
      <SetupDots step={6} total={SETUP_TOTAL} />
      <View style={{ gap: 6 }}>
        <Txt variant="h1">Add funds</Txt>
        <Txt variant="muted">Move Devnet SOL from your wallet into your vault. Your agent can only spend what&apos;s here.</Txt>
      </View>
      <FundPicker busy={action.isPending} label="Add" onFund={(lamports) => action.mutate({ action: 'deposit', params: { amount_lamports: lamports } })} />
      <ActionResult action={action} />
    </>
  )
}

function useNowSecs() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15_000)
    return () => clearInterval(id)
  }, [])
  return now
}

function Disclosure({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const p = usePalette()
  const [open, setOpen] = useState(false)
  return (
    <View style={{ gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)} style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
        {icon}
        <Txt style={{ fontFamily: fonts.semibold }}>{title}</Txt>
        <ChevronDown color={p.text} size={16} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {open ? <Animated.View entering={FadeIn.duration(200)}>{children}</Animated.View> : null}
    </View>
  )
}

// Vault: balance, freeze, rules, funds, withdraw and the Security test.
export function VaultScreen({ data, onChanged }: { data: VaultReadResponse; onChanged: () => void }) {
  const p = usePalette()
  const action = useOwnerAction()
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  const now = useNowSecs()
  const v = data.vault!
  const current: Rules = { maxPerTxLamports: v.max_per_tx_lamports, dailyCapLamports: v.daily_cap_lamports, cooldownSecs: v.cooldown_secs }
  const spent = now - v.window_start_ts < 86_400 ? v.daily_spent_lamports : 0

  return (
    <>
      <Row>
        <Txt variant="h1">Vault</Txt>
        <TonePill label={v.is_frozen ? 'Frozen' : 'Active'} tone={v.is_frozen ? 'frozen' : 'paid'} />
      </Row>

      <Card tone={v.is_frozen ? 'frozen' : undefined}>
        <Txt variant="label">Vault balance</Txt>
        <Txt variant="big">{formatSol(data.vault_funds_lamports)}</Txt>
        <Txt variant="muted">
          Spent today {formatSol(spent)} of {formatSol(v.daily_cap_lamports)} · {v.tx_count} payment{v.tx_count === 1 ? '' : 's'}
        </Txt>
      </Card>

      <Card tone={v.is_frozen ? 'frozen' : undefined}>
        <Txt variant="h2">{v.is_frozen ? 'Your vault is frozen' : 'Freeze vault'}</Txt>
        <Txt variant="muted">{v.is_frozen ? "Your agent can't spend until you unfreeze." : 'Instantly stop your agent from spending. Say “Freeze my vault” too.'}</Txt>
        <Button
          busy={action.isPending && action.variables?.action === 'toggle_freeze'}
          icon={v.is_frozen ? <Lock color={p.text} size={18} strokeWidth={1.75} /> : <IceCube color={p.frozen} size={20} />}
          onPress={() => action.mutate({ action: 'toggle_freeze', params: { frozen: !v.is_frozen } }, { onSettled: onChanged })}
          title={v.is_frozen ? 'Unfreeze' : 'Freeze'}
          variant={v.is_frozen ? 'secondary' : 'frozen'}
        />
      </Card>

      <Card>
        <Txt variant="h2">Your rules</Txt>
        <Txt>{sentence(current)}</Txt>
        <Txt variant="muted">
          Wait {v.cooldown_secs}s between payments · {v.allowlist.length ? `pays only ${v.allowlist.length === 1 ? '1 trusted wallet' : `${v.allowlist.length} trusted wallets`}` : 'can pay anyone'}
        </Txt>
        <Disclosure title="Edit rules">
          <RulesEditor
            busy={action.isPending && action.variables?.action === 'update_policy'}
            initial={current}
            initialTrusted={v.allowlist[0] ?? ''}
            onSubmit={(r, allowlist) =>
              action.mutate(
                {
                  action: 'update_policy',
                  params: { max_per_tx_lamports: r.maxPerTxLamports, daily_cap_lamports: r.dailyCapLamports, cooldown_secs: r.cooldownSecs, allowlist, agent_delegate: v.agent_delegate },
                },
                { onSettled: onChanged },
              )
            }
            submitLabel="Save rules"
          />
        </Disclosure>
      </Card>

      <Card>
        <Txt variant="h2">Add funds</Txt>
        <FundPicker
          busy={action.isPending && action.variables?.action === 'deposit'}
          label="Add"
          onFund={(lamports) => action.mutate({ action: 'deposit', params: { amount_lamports: lamports } }, { onSettled: onChanged })}
        />
      </Card>

      <Card>
        <Txt variant="h2">Withdraw</Txt>
        <Txt variant="muted">Move everything in the vault back to your wallet. Works even while frozen.</Txt>
        <Button
          busy={action.isPending && action.variables?.action === 'withdraw_all'}
          disabled={data.vault_funds_lamports === 0}
          icon={<ArrowUpFromLine color={p.blocked} size={18} strokeWidth={1.75} />}
          onPress={() => {
            if (!confirmWithdraw) return setConfirmWithdraw(true)
            setConfirmWithdraw(false)
            action.mutate({ action: 'withdraw_all' }, { onSettled: onChanged })
          }}
          title={confirmWithdraw ? `Tap again to withdraw ${formatSol(data.vault_funds_lamports)}` : 'Withdraw all'}
          variant="danger"
        />
      </Card>

      <ActionResult action={action} />

      <Card>
        <Disclosure icon={<FlaskConical color={p.text} size={18} strokeWidth={1.75} />} title="Security test & demo checks">
          <View style={{ gap: 20 }}>
            <ReadinessCard data={data} />
            <RoguePanel onRun={onChanged} vaultPda={v.vault_pda} />
            <View style={{ gap: 6 }}>
              {[
                ['Vault', v.vault_pda],
                ['Funds', v.vault_funds_pda],
                ['Agent key', v.agent_delegate],
              ].map(([k, addr]) => (
                <Pressable key={k} onPress={() => void WebBrowser.openBrowserAsync(explorerAddressUrl(addr!))} style={{ flexDirection: 'row', gap: 12 }}>
                  <Txt style={{ width: 90 }} variant="muted">
                    {k}
                  </Txt>
                  <Txt style={{ color: p.primary }}>{ellipsify(addr!, 6)}</Txt>
                </Pressable>
              ))}
            </View>
          </View>
        </Disclosure>
      </Card>
    </>
  )
}
