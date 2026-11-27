import { ScrollView, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { appStyles } from '@/constants/app-styles'
import { ConsoleFeatureIndex } from '@/features/console/console-feature-index'

export default function ConsoleScreen() {
  return (
    <SafeAreaView style={appStyles.screen}>
      <ScrollView contentContainerStyle={appStyles.stack}>
        <Text style={appStyles.title}>Speak</Text>
        <ConsoleFeatureIndex />
      </ScrollView>
    </SafeAreaView>
  )
}
