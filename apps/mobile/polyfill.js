import 'react-native-get-random-values'
import { Buffer } from 'buffer'
// URL / URLSearchParams for supabase-js on React Native (Supabase RN guidance).
import 'react-native-url-polyfill/auto'
import { TurboModuleRegistry } from 'react-native'

if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer
}

// react-native-quick-crypto requires native QuickBase64 (present in custom dev client / APK, absent in Expo Go).
if (TurboModuleRegistry?.get?.('QuickBase64')) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-quick-crypto').install()
}
