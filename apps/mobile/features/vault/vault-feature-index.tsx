import { explorerAddressUrl } from '@speakpay/shared'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import * as WebBrowser from 'expo-web-browser'
import { Pressable, Text, View } from 'react-native'
import { appStyles } from '@/constants/app-styles'
import { AccountFeatureConnect } from '@/features/account/account-feature-connect'
import { AccountFeatureDisconnect } from '@/features/account/account-feature-disconnect'
import { AccountFeatureGetBalance } from '@/features/account/account-feature-get-balance'
import { AccountFeatureSignMessage } from '@/features/account/account-feature-sign-message'
import { useVaultAddresses } from '@/features/vault/use-vault-addresses'
import { ellipsify } from '@/utils/ellipsify'

function AddressRow({ label, address }: { label: string; address: string }) {
  return (
    <Pressable onPress={() => void WebBrowser.openBrowserAsync(explorerAddressUrl(address))}>
      <Text style={appStyles.label}>{label}</Text>
      <Text style={appStyles.mono}>{ellipsify(address, 6)}</Text>
    </Pressable>
  )
}

// Vault screen, M1 scope: MWA connect, live wallet balance, derived vault addresses.
// Create / deposit / policy actions arrive with /api/tx/owner (handoff H2).
export function VaultFeatureIndex() {
  const { account } = useMobileWallet()
  const addresses = useVaultAddresses(account?.address)

  if (!account || !addresses) {
    return (
      <View style={appStyles.stack}>
        <Text style={appStyles.textMuted}>Connect a Devnet wallet (Phantom or Solflare) to begin.</Text>
        <AccountFeatureConnect />
      </View>
    )
  }

  return (
    <View style={appStyles.stack}>
      <View style={appStyles.card}>
        <AddressRow label="Owner wallet" address={account.address.toBase58()} />
        <AccountFeatureGetBalance address={account.address} />
      </View>
      <View style={appStyles.card}>
        <AddressRow label="Policy vault (PDA)" address={addresses.policyVault.toBase58()} />
        <AddressRow label="Vault funds (PDA)" address={addresses.vaultFunds.toBase58()} />
      </View>
      <AccountFeatureSignMessage address={account.address} />
      <AccountFeatureDisconnect />
    </View>
  )
}
