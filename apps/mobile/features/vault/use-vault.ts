import { VersionedTransaction } from '@solana/web3.js'
import type { OwnerAction, OwnerTxResponse, VaultReadResponse, VaultSyncResponse } from '@speakpay/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { Buffer } from 'buffer'
import { apiGet, apiPost } from '@/features/api/api-client'

const vaultKey = (owner: string) => ['vault', owner] as const

/** Live PolicyVault state from chain via GET /api/vault/[owner]. */
export function useVault(owner: string | undefined) {
  return useQuery({
    queryKey: vaultKey(owner ?? ''),
    queryFn: () => apiGet<VaultReadResponse>(`/api/vault/${owner}`),
    enabled: !!owner,
    refetchInterval: 15_000,
  })
}

/**
 * Owner action (PRD D7): server builds the unsigned tx → MWA signs and sends →
 * wait for confirmation → /api/vault/sync mirrors the verified state.
 */
export function useOwnerAction() {
  const { account, connection, signAndSendTransactions } = useMobileWallet()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (action: Omit<OwnerAction, 'owner_pubkey'>) => {
      if (!account) throw new Error('Connect a wallet first')
      const owner = account.address.toBase58()
      const built = await apiPost<OwnerTxResponse>('/api/tx/owner', { ...action, owner_pubkey: owner })
      const tx = VersionedTransaction.deserialize(Buffer.from(built.transaction_base64, 'base64'))
      const { context } = await connection.getLatestBlockhashAndContext()
      const signature = await signAndSendTransactions(tx, context.slot)
      const confirmed = await connection.confirmTransaction(
        { signature, blockhash: built.recent_blockhash, lastValidBlockHeight: built.last_valid_block_height },
        'confirmed',
      )
      if (confirmed.value.err) throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmed.value.err)}`)
      const synced = await apiPost<VaultSyncResponse>('/api/vault/sync', { owner_pubkey: owner, tx_signature: signature })
      return { signature, vault: synced.vault }
    },
    onSettled: () => {
      if (account) void qc.invalidateQueries({ queryKey: vaultKey(account.address.toBase58()) })
    },
  })
}
