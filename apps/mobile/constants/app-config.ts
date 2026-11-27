import { PublicKey } from '@solana/web3.js'
import { SolanaCluster } from '@wallet-ui/react-native-web3js'

// Every value here is EXPO_PUBLIC_* and compiled into the APK — public by design (ENVIRONMENT.md §1.3).
function env(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name}. Copy apps/mobile/.env.example to .env (or set it in EAS env).`)
  }
  return value
}

// Expo inlines EXPO_PUBLIC_* only for static `process.env.NAME` reads, so each is spelled out.
export const AppConfig = {
  name: process.env.EXPO_PUBLIC_APP_IDENTITY_NAME ?? 'SpeakPay',
  uri: env('EXPO_PUBLIC_APP_IDENTITY_URI', process.env.EXPO_PUBLIC_APP_IDENTITY_URI),
  apiBaseUrl: env('EXPO_PUBLIC_API_BASE_URL', process.env.EXPO_PUBLIC_API_BASE_URL),
  programId: new PublicKey(
    env('EXPO_PUBLIC_POLICY_VAULT_PROGRAM_ID', process.env.EXPO_PUBLIC_POLICY_VAULT_PROGRAM_ID),
  ),
  supabaseUrl: env('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: env('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  // Devnet only (AGENTS.md §5.4).
  network: {
    id: 'solana:devnet',
    label: 'Devnet',
    url: process.env.EXPO_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
  } satisfies SolanaCluster,
} as const
