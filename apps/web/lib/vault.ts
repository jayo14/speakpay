import "server-only";

import { PublicKey } from "@solana/web3.js";
import {
  decodePolicyVault,
  findPolicyVault,
  findVaultFunds,
  type VaultAccounts,
  type VaultState,
} from "@speakpay/shared";

import { HttpError } from "./http";
import { connection, programId } from "./solana";
import { withTimeout } from "./timeout";

export function vaultAccounts(owner: PublicKey): VaultAccounts {
  const pid = programId();
  const [policyVault] = findPolicyVault(owner, pid);
  const [vaultFunds] = findVaultFunds(policyVault, pid);
  return { programId: pid, owner, policyVault, vaultFunds };
}

export interface LiveVault {
  vault: VaultState | null;
  vault_funds_lamports: number;
  accounts: VaultAccounts;
}

function toState(accounts: VaultAccounts, data: Uint8Array): VaultState {
  const d = decodePolicyVault(data);
  return {
    vault_pda: accounts.policyVault.toBase58(),
    vault_funds_pda: accounts.vaultFunds.toBase58(),
    owner: d.owner,
    agent_delegate: d.agent_delegate,
    max_per_tx_lamports: d.max_per_tx_lamports,
    daily_cap_lamports: d.daily_cap_lamports,
    daily_spent_lamports: d.daily_spent_lamports,
    window_start_ts: d.window_start_ts,
    cooldown_secs: d.cooldown_secs,
    last_tx_ts: d.last_tx_ts,
    is_frozen: d.is_frozen,
    allowlist: d.allowlist,
    last_evidence_hash: d.last_evidence_hash,
    tx_count: d.tx_count,
  };
}

/** Reads PolicyVault + VaultFunds from chain — the source of truth. */
export async function readVaultByOwner(owner: PublicKey): Promise<LiveVault> {
  const accounts = vaultAccounts(owner);
  const [vaultInfo, funds] = await withTimeout(
    connection().getMultipleAccountsInfo([accounts.policyVault, accounts.vaultFunds]),
    8_000,
    "vault read",
  );
  if (vaultInfo && !vaultInfo.owner.equals(accounts.programId)) {
    throw new Error("PolicyVault PDA is not owned by the policy_vault program");
  }
  return {
    vault: vaultInfo ? toState(accounts, vaultInfo.data) : null,
    vault_funds_lamports: funds?.lamports ?? 0,
    accounts,
  };
}

/** Same as readVaultByOwner but starting from the vault PDA (voice / rogue routes). */
export async function readVaultByPda(vaultPda: PublicKey): Promise<LiveVault & { vault: VaultState }> {
  const info = await withTimeout(connection().getAccountInfo(vaultPda), 8_000, "vault read");
  if (!info) throw new HttpError(404, "VAULT_NOT_FOUND", "No PolicyVault exists at this address on Devnet");
  if (!info.owner.equals(programId())) throw new HttpError(400, "NOT_A_VAULT", "Account is not a policy_vault PolicyVault");
  const owner = new PublicKey(decodePolicyVault(info.data).owner);
  const live = await readVaultByOwner(owner);
  if (!live.accounts.policyVault.equals(vaultPda) || !live.vault) {
    throw new HttpError(400, "NOT_A_VAULT", "Vault PDA does not match its owner seeds");
  }
  return { ...live, vault: live.vault };
}
