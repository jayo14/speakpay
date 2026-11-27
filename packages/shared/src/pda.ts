import { PublicKey } from "@solana/web3.js";

import { POLICY_VAULT_SEED, VAULT_FUNDS_SEED } from "./constants";

const enc = new TextEncoder();

/** [b"policy_vault", owner] */
export function findPolicyVault(owner: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([enc.encode(POLICY_VAULT_SEED), owner.toBytes()], programId);
}

/** [b"vault_funds", policy_vault] */
export function findVaultFunds(policyVault: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [enc.encode(VAULT_FUNDS_SEED), policyVault.toBytes()],
    programId,
  );
}
