import { DEMO_POLICY, explorerAddressUrl, explorerTxUrl, lamportsToSol, solToLamports, type VaultReadResponse } from '@speakpay/shared'
import { PublicKey } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { AppButton } from '@/components/app-button'
import { AppConfig } from '@/constants/app-config'
import { appStyles, colors } from '@/constants/app-styles'
import { AccountFeatureConnect } from '@/features/account/account-feature-connect'
import { AccountFeatureDisconnect } from '@/features/account/account-feature-disconnect'
import { AccountFeatureGetBalance } from '@/features/account/account-feature-get-balance'
import { ReadinessCard } from '@/features/vault/readiness-card'
import { useOwnerAction, useVault } from '@/features/vault/use-vault'
import { VaultUiCard } from '@/features/vault/vault-ui-card'
import { ellipsify } from '@/utils/ellipsify'
import { formatError } from '@/utils/format-error'

function AddressRow({ label, address }: { label: string; address: string }) {
  return (
    <Pressable onPress={() => void WebBrowser.openBrowserAsync(explorerAddressUrl(address))}>
      <Text style={appStyles.label}>{label}</Text>
      <Text style={appStyles.mono}>{ellipsify(address, 6)}</Text>
    </Pressable>
  )
}

function isPubkey(s: string) {
  try {
    return new PublicKey(s).toBase58() === s
  } catch {
    return false
  }
}

function parsePolicy(maxSolStr: string, dailySolStr: string, cooldownStr: string, allowStr: string) {
  const maxSol = Number(maxSolStr)
  const dailySol = Number(dailySolStr)
  const cooldown = Number(cooldownStr)
  const allowTrimmed = allowStr.trim()
  const allowOk = allowTrimmed === '' || isPubkey(allowTrimmed)
  const valid =
    Number.isFinite(maxSol) &&
    maxSol > 0 &&
    Number.isFinite(dailySol) &&
    dailySol >= maxSol &&
    Number.isInteger(cooldown) &&
    cooldown >= 0 &&
    allowOk
  return {
    valid,
    allowOk,
    maxPerTxLamports: valid ? solToLamports(maxSol) : 0,
    dailyCapLamports: valid ? solToLamports(dailySol) : 0,
    cooldownSecs: valid ? cooldown : 0,
    allowlist: allowTrimmed ? [allowTrimmed] : [],
  }
}

function PolicyFields({
  maxPerTx,
  setMaxPerTx,
  dailyCap,
  setDailyCap,
  cooldownSecs,
  setCooldownSecs,
  allowlistWallet,
  setAllowlistWallet,
  allowOk,
}: {
  maxPerTx: string
  setMaxPerTx: (v: string) => void
  dailyCap: string
  setDailyCap: (v: string) => void
  cooldownSecs: string
  setCooldownSecs: (v: string) => void
  allowlistWallet: string
  setAllowlistWallet: (v: string) => void
  allowOk: boolean
}) {
  const inputStyle = { borderColor: colors.line, borderWidth: 1, padding: 8 }
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={appStyles.label}>Max / tx (SOL)</Text>
          <TextInput keyboardType="decimal-pad" onChangeText={setMaxPerTx} style={[appStyles.mono, inputStyle]} value={maxPerTx} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={appStyles.label}>Daily cap (SOL)</Text>
          <TextInput keyboardType="decimal-pad" onChangeText={setDailyCap} style={[appStyles.mono, inputStyle]} value={dailyCap} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={appStyles.label}>Cooldown (s)</Text>
          <TextInput keyboardType="number-pad" onChangeText={setCooldownSecs} style={[appStyles.mono, inputStyle]} value={cooldownSecs} />
        </View>
      </View>
      <Text style={appStyles.label}>Allowlisted merchant wallet (optional)</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setAllowlistWallet}
        placeholder="Paste merchant wallet, or leave empty for any recipient"
        placeholderTextColor={colors.inkMuted}
        style={[appStyles.mono, { borderColor: allowOk ? colors.line : colors.block, borderWidth: 1, padding: 8 }]}
        value={allowlistWallet}
      />
    </>
  )
}

function CreateVaultCard({
  busy,
  onCreate,
}: {
  busy: boolean
  onCreate: (params: {
    max_per_tx_lamports: number
    daily_cap_lamports: number
    cooldown_secs: number
    allowlist: string[]
  }) => void
}) {
  const [maxPerTx, setMaxPerTx] = useState(String(lamportsToSol(DEMO_POLICY.maxPerTxLamports)))
  const [dailyCap, setDailyCap] = useState(String(lamportsToSol(DEMO_POLICY.dailyCapLamports)))
  const [cooldownSecs, setCooldownSecs] = useState(String(DEMO_POLICY.cooldownSecs))
  const [allowlistWallet, setAllowlistWallet] = useState(AppConfig.merchantCleanWallet)
  const parsed = parsePolicy(maxPerTx, dailyCap, cooldownSecs, allowlistWallet)

  return (
    <View style={appStyles.card}>
      <Text style={appStyles.label}>Create your vault</Text>
      <Text style={appStyles.textMuted}>Set hard spending limits enforced on-chain. Demo defaults are pre-filled.</Text>
      <PolicyFields
        allowOk={parsed.allowOk}
        allowlistWallet={allowlistWallet}
        cooldownSecs={cooldownSecs}
        dailyCap={dailyCap}
        maxPerTx={maxPerTx}
        setAllowlistWallet={setAllowlistWallet}
        setCooldownSecs={setCooldownSecs}
        setDailyCap={setDailyCap}
        setMaxPerTx={setMaxPerTx}
      />
      <AppButton
        busy={busy}
        disabled={!parsed.valid}
        onPress={() =>
          onCreate({
            max_per_tx_lamports: parsed.maxPerTxLamports,
            daily_cap_lamports: parsed.dailyCapLamports,
            cooldown_secs: parsed.cooldownSecs,
            allowlist: parsed.allowlist,
          })
        }
        title="Create vault"
      />
      {!parsed.valid ? (
        <Text style={appStyles.textDanger}>Ensure 0 &lt; max/tx ≤ daily cap, cooldown ≥ 0, and allowlist is valid.</Text>
      ) : null}
    </View>
  )
}

function EditPolicyCard({
  vault,
  busy,
  onSave,
}: {
  vault: NonNullable<VaultReadResponse['vault']>
  busy: boolean
  onSave: (params: {
    max_per_tx_lamports: number
    daily_cap_lamports: number
    cooldown_secs: number
    allowlist: string[]
    agent_delegate: string
  }) => void
}) {
  const [open, setOpen] = useState(false)
  const [maxPerTx, setMaxPerTx] = useState(String(lamportsToSol(vault.max_per_tx_lamports)))
  const [dailyCap, setDailyCap] = useState(String(lamportsToSol(vault.daily_cap_lamports)))
  const [cooldownSecs, setCooldownSecs] = useState(String(vault.cooldown_secs))
  const [allowlistWallet, setAllowlistWallet] = useState(vault.allowlist[0] ?? '')
  const parsed = parsePolicy(maxPerTx, dailyCap, cooldownSecs, allowlistWallet)

  return (
    <View style={appStyles.card}>
      <Pressable onPress={() => setOpen((o) => !o)}>
        <Text style={appStyles.label}>{open ? '▾ Edit policy' : '▸ Edit policy'}</Text>
      </Pressable>
      {open ? (
        <>
          <PolicyFields
            allowOk={parsed.allowOk}
            allowlistWallet={allowlistWallet}
            cooldownSecs={cooldownSecs}
            dailyCap={dailyCap}
            maxPerTx={maxPerTx}
            setAllowlistWallet={setAllowlistWallet}
            setCooldownSecs={setCooldownSecs}
            setDailyCap={setDailyCap}
            setMaxPerTx={setMaxPerTx}
          />
          <AppButton
            busy={busy}
            disabled={!parsed.valid}
            onPress={() =>
              onSave({
                max_per_tx_lamports: parsed.maxPerTxLamports,
                daily_cap_lamports: parsed.dailyCapLamports,
                cooldown_secs: parsed.cooldownSecs,
                allowlist: parsed.allowlist,
                agent_delegate: vault.agent_delegate,
              })
            }
            title="Save policy"
            variant="secondary"
          />
        </>
      ) : null}
    </View>
  )
}

// Vault screen (PRD §8.2 Screen 1): connect → create → deposit → live state → owner actions.
export function VaultFeatureIndex() {
  const { account } = useMobileWallet()
  const owner = account?.address.toBase58()
  const vaultQuery = useVault(owner)
  const action = useOwnerAction()
  const [lastSig, setLastSig] = useState<string | null>(null)

  if (!account || !owner) {
    return (
      <View style={appStyles.stack}>
        <View style={appStyles.card}>
          <Text style={appStyles.label}>How SpeakPay works</Text>
          <Text style={appStyles.text}>Your Devnet wallet is your account — no signup needed.</Text>
          <Text style={appStyles.textMuted}>1. Connect Phantom or Solflare (Devnet)</Text>
          <Text style={appStyles.textMuted}>2. Create & fund your on-chain vault</Text>
          <Text style={appStyles.textMuted}>3. Hold the mic on Console to pay</Text>
        </View>
        <AccountFeatureConnect />
        <Pressable onPress={() => void WebBrowser.openBrowserAsync('https://faucet.solana.com')}>
          <Text style={appStyles.textMuted}>Need Devnet SOL? Open faucet.solana.com ↗</Text>
        </Pressable>
      </View>
    )
  }

  const run = (a: Parameters<typeof action.mutate>[0]) =>
    action.mutate(a, { onSuccess: (r) => setLastSig(r.signature) })

  const data = vaultQuery.data

  return (
    <View style={appStyles.stack}>
      <View style={appStyles.card}>
        <AddressRow label="Owner wallet" address={owner} />
        <AccountFeatureGetBalance address={account.address} />
      </View>

      {vaultQuery.isPending ? <Text style={appStyles.textMuted}>Reading vault from Devnet…</Text> : null}
      {vaultQuery.isError ? <Text style={appStyles.textDanger}>{formatError(vaultQuery.error)}</Text> : null}

      {data && !data.vault ? (
        <CreateVaultCard busy={action.isPending} onCreate={(params) => run({ action: 'init', params })} />
      ) : null}

      {data?.vault ? (
        <>
          <VaultUiCard fundsLamports={data.vault_funds_lamports} vault={data.vault} />
          <ReadinessCard data={data} />
          <AppButton
            busy={action.isPending}
            onPress={() => run({ action: 'deposit', params: { amount_lamports: DEMO_POLICY.depositLamports } })}
            title={`Deposit ${lamportsToSol(DEMO_POLICY.depositLamports)} SOL`}
          />
          <AppButton
            busy={action.isPending}
            onPress={() => run({ action: 'toggle_freeze', params: { frozen: !data.vault!.is_frozen } })}
            title={data.vault.is_frozen ? 'Unfreeze vault' : 'Freeze vault'}
            variant="secondary"
          />
          <AppButton
            busy={action.isPending}
            disabled={data.vault_funds_lamports === 0}
            onPress={() => run({ action: 'withdraw_all' })}
            title="Withdraw all"
            variant="danger"
          />
          <EditPolicyCard
            busy={action.isPending}
            key={`${data.vault.vault_pda}:${data.vault.max_per_tx_lamports}:${data.vault.daily_cap_lamports}:${data.vault.cooldown_secs}:${data.vault.allowlist.join(',')}`}
            onSave={(params) => run({ action: 'update_policy', params })}
            vault={data.vault}
          />
          <View style={appStyles.card}>
            <AddressRow label="Policy vault (PDA)" address={data.vault.vault_pda} />
            <AddressRow label="Vault funds (PDA)" address={data.vault.vault_funds_pda} />
            <AddressRow label="Agent delegate" address={data.vault.agent_delegate} />
          </View>
        </>
      ) : null}

      {action.isError ? <Text style={appStyles.textDanger}>{formatError(action.error)}</Text> : null}
      {lastSig ? (
        <Pressable onPress={() => void WebBrowser.openBrowserAsync(explorerTxUrl(lastSig))}>
          <Text style={appStyles.textSuccess}>Confirmed: {ellipsify(lastSig, 8)} — view on Explorer</Text>
        </Pressable>
      ) : null}
      <AccountFeatureDisconnect />
    </View>
  )
}
