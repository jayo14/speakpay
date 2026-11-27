import { ScrollView, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { appStyles } from '@/constants/app-styles'
import { FeedFeatureIndex } from '@/features/feed/feed-feature-index'

export default function FeedScreen() {
  return (
    <SafeAreaView style={appStyles.screen}>
      <ScrollView contentContainerStyle={appStyles.stack}>
        <Text style={appStyles.title}>Activity</Text>
        <FeedFeatureIndex />
      </ScrollView>
    </SafeAreaView>
  )
}
