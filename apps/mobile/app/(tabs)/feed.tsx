import { Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { appStyles } from '@/constants/app-styles'

// Live audit feed (PRD §8.2 Screen 3): Supabase select + Realtime INSERTs, wired after handoff H3.
export default function FeedScreen() {
  return (
    <SafeAreaView style={appStyles.screen}>
      <Text style={appStyles.title}>Feed</Text>
      <Text style={appStyles.textMuted}>Audit runs for your vault appear here as they happen.</Text>
    </SafeAreaView>
  )
}
