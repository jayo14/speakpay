import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MobileWalletProvider } from '@wallet-ui/react-native-web3js'
import { PropsWithChildren } from 'react'
import { AppConfig } from '@/constants/app-config'

const identity = { name: AppConfig.name, uri: AppConfig.uri }
const queryClient = new QueryClient()

// Single network (Devnet), so MobileWalletProvider is used directly.
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <MobileWalletProvider chain={AppConfig.network.id} endpoint={AppConfig.network.url} identity={identity}>
        {children}
      </MobileWalletProvider>
    </QueryClientProvider>
  )
}
