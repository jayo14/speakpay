import { DEMO_POLICY, explorerAddressUrl, explorerTxUrl, lamportsToSol } from '@speakpay/shared'
import { PublicKey } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { AppButton } from '@/components/app-button'
import { appStyles, colors } from '@/constants/app-styles'
import { AccountFeatureConnect } from '@/features/account/account-feature-connect'
import { AccountFeatureDisconnect } from '@/features/account/account-feature-disconnect'
import { AccountFeatureGetBalance } from '@/features/account/account-feature-get-balance'
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

// Vault screen (PRD §8.2 Screen 1): connect → create → deposit → live state → owner actions.
export function VaultFeatureIndex() {
  const { account } = useMobileWallet()
  const owner = account?.address.toBase58()
  const vaultQuery = useVault(owner)
  const action = useOwnerAction()
  const [allowlistWallet, setAllowlistWallet] = useState('')
  const [lastSig, setLastSig] = useState<string | null>(null)

  if (!account || !owner) {
    return (
      <View style={appStyles.stack}>
        <Text style={appStyles.textMuted}>Connect a Devnet wallet (Phantom or Solflare) to begin.</Text>
        <AccountFeatureConnect />
      </View>
    )
  }

  const run = (a: Parameters<typeof action.mutate>[0]) =>
    action.mutate(a, { onSuccess: (r) => setLastSig(r.signature) })

  const data = vaultQuery.data
  const allowlistValid = allowlistWallet === '' || isPubkey(allowlistWallet.trim())

  return (
    <View style={appStyles.stack}>
      <View style={appStyles.card}>
        <AddressRow label="Owner wallet" address={owner} />
        <AccountFeatureGetBalance address={account.address} />
      </View>

      {vaultQuery.isPending ? <Text style={appStyles.textMuted}>Reading vault from Devnet…</Text> : null}
      {vaultQuery.isError ? <Text style={appStyles.textDanger}>{formatError(vaultQuery.error)}</Text> : null}

      {data && !data.vault ? (
        <View style={appStyles.card}>
          <Text style={appStyles.label}>Create your vault</Text>
          <Text style={appStyles.text}>
            Max {lamportsToSol(DEMO_POLICY.maxPerTxLamports)} SOL per payment · {lamportsToSol(DEMO_POLICY.dailyCapLamports)} SOL
            per day · {DEMO_POLICY.cooldownSecs}s cooldown
          </Text>
          <Text style={appStyles.label}>Allowlisted merchant wallet (optional)</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setAllowlistWallet}
            placeholder="Paste merchant wallet, or leave empty for any recipient"
            placeholderTextColor={colors.inkMuted}
            style={[appStyles.mono, { borderColor: allowlistValid ? colors.line : colors.block, borderWidth: 1, padding: 8 }]}
            value={allowlistWallet}
          />
          <AppButton
            busy={action.isPending}
            disabled={!allowlistValid}
            onPress={() =>
              run({
                action: 'init',
                params: {
                  max_per_tx_lamports: DEMO_POLICY.maxPerTxLamports,
                  daily_cap_lamports: DEMO_POLICY.dailyCapLamports,
                  cooldown_secs: DEMO_POLICY.cooldownSecs,
                  allowlist: allowlistWallet.trim() ? [allowlistWallet.trim()] : [],
                },
              })
            }
            title="Create vault"
          />
        </View>
      ) : null}

      {data?.vault ? (
        <>
          <VaultUiCard fundsLamports={data.vault_funds_lamports} vault={data.vault} />
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
