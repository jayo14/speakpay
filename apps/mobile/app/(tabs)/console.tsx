import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { appStyles } from '@/constants/app-styles'

// Hold-to-talk voice console (PRD §8.2 Screen 2) is built in Block 2 against /api/voice-command (H4).
export default function ConsoleScreen() {
  const { account } = useMobileWallet()
  return (
    <SafeAreaView style={appStyles.screen}>
      <Text style={appStyles.title}>Console</Text>
      <Text style={appStyles.textMuted}>
        {account ? 'Create and fund your vault first, then hold to speak a payment.' : 'Connect a wallet on the Vault tab.'}
      </Text>
    </SafeAreaView>
  )
}
