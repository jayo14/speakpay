import { PublicKey } from '@solana/web3.js'
import { findPolicyVault, findVaultFunds } from '@speakpay/shared'
import { useMemo } from 'react'
import { AppConfig } from '@/constants/app-config'

/** PolicyVault + VaultFunds PDAs for the connected owner (PRD §4.1). */
export function useVaultAddresses(owner: PublicKey | undefined) {
  return useMemo(() => {
    if (!owner) return null
    const [policyVault] = findPolicyVault(owner, AppConfig.programId)
    const [vaultFunds] = findVaultFunds(policyVault, AppConfig.programId)
    return { policyVault, vaultFunds }
  }, [owner])
}
