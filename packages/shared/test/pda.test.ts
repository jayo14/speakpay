import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import { findPolicyVault, findVaultFunds } from "../src/pda";

// Same fixed vectors as `seeds_match_shared_package` in programs/policy-vault/src/lib.rs.
describe("PDA seeds match the Anchor program", () => {
  const program = new PublicKey(new Uint8Array(32).fill(9));
  const owner = new PublicKey(new Uint8Array(32).fill(7));

  it("derives PolicyVault and VaultFunds identically to Rust", () => {
    const [vault] = findPolicyVault(owner, program);
    const [funds] = findVaultFunds(vault, program);
    expect(vault.toBase58()).toBe("DNpZ7WfN9vCzjvQ81mU1jXmeNEzxLEPkD4Yhao9RT1zo");
    expect(funds.toBase58()).toBe("4oJ6iSTZnKBKBHmSaKsNypsPpBncyPsV7Fm8x4epZJJ8");
  });
});
