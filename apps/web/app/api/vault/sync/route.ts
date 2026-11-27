import { PublicKey } from "@solana/web3.js";
import type { VaultSyncResponse } from "@speakpay/shared";
import { NextResponse } from "next/server";
import { z } from "zod";

import { HttpError, errorResponse, parseJson } from "@/lib/http";
import { pubkey, signature } from "@/lib/schemas";
import { connection, programId } from "@/lib/solana";
import { supabaseAdmin } from "@/lib/supabase-server";
import { withTimeout } from "@/lib/timeout";
import { readVaultByOwner } from "@/lib/vault";

export const runtime = "nodejs";

const body = z.object({ owner_pubkey: pubkey, tx_signature: signature });

// After an owner tx: confirm it succeeded on-chain, re-read the PDA, mirror it into
// vault_profiles. Nothing is written unless the chain agrees (PRD §6.4).
export async function POST(req: Request) {
  try {
    const { owner_pubkey, tx_signature } = await parseJson(req, body);
    const owner = new PublicKey(owner_pubkey);

    const tx = await withTimeout(
      connection().getTransaction(tx_signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }),
      10_000,
      "getTransaction",
    );
    if (!tx) throw new HttpError(404, "TX_NOT_FOUND", "Transaction not found or not yet confirmed");
    if (tx.meta?.err) throw new HttpError(409, "TX_FAILED", "Transaction failed on-chain");

    const keys = tx.transaction.message.getAccountKeys().staticAccountKeys;
    const signers = keys.slice(0, tx.transaction.message.header.numRequiredSignatures);
    if (!signers.some((k) => k.equals(owner))) {
      throw new HttpError(403, "NOT_OWNER_TX", "Transaction was not signed by this owner");
    }
    if (!keys.some((k) => k.equals(programId()))) {
      throw new HttpError(400, "NOT_VAULT_TX", "Transaction did not call the policy_vault program");
    }

    const live = await readVaultByOwner(owner);
    if (!live.vault) throw new HttpError(404, "VAULT_NOT_FOUND", "No vault on-chain for this owner");
    const v = live.vault;

    const { error } = await supabaseAdmin()
      .from("vault_profiles")
      .upsert(
        {
          vault_pda: v.vault_pda,
          owner_pubkey: v.owner,
          delegate_pubkey: v.agent_delegate,
          max_per_tx_lamports: v.max_per_tx_lamports,
          daily_cap_lamports: v.daily_cap_lamports,
          cooldown_secs: v.cooldown_secs,
          allowlist: v.allowlist,
          is_frozen: v.is_frozen,
          last_sync_signature: tx_signature,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "vault_pda" },
      );
    if (error) throw new HttpError(502, "SUPABASE_WRITE_FAILED", error.message);

    const res: VaultSyncResponse = { vault: v };
    return NextResponse.json(res);
  } catch (e) {
    return errorResponse(e);
  }
}
