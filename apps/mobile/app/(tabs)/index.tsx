import { ScrollView, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { appStyles } from '@/constants/app-styles'
import { VaultFeatureIndex } from '@/features/vault/vault-feature-index'

export default function VaultScreen() {
  return (
    <SafeAreaView style={appStyles.screen}>
      <ScrollView contentContainerStyle={appStyles.stack}>
        <Text style={appStyles.title}>Vault</Text>
        <VaultFeatureIndex />
      </ScrollView>
    </SafeAreaView>
  )
}
