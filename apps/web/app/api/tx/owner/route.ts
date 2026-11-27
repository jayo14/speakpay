import { PublicKey, TransactionMessage, VersionedTransaction, type TransactionInstruction } from "@solana/web3.js";
import { ix, type OwnerTxResponse } from "@speakpay/shared";
import { NextResponse } from "next/server";

import { HttpError, errorResponse, parseJson } from "@/lib/http";
import { ownerAction } from "@/lib/schemas";
import { agentDelegate, connection } from "@/lib/solana";
import { withTimeout } from "@/lib/timeout";
import { readVaultByOwner } from "@/lib/vault";

export const runtime = "nodejs";

// Builds an UNSIGNED owner transaction (PRD §6.4, D7). The owner's wallet signs and
// sends it (MWA signAndSendTransactions / Wallet Adapter sendTransaction). The server
// never sees owner keys.
export async function POST(req: Request) {
  try {
    const body = await parseJson(req, ownerAction);
    const owner = new PublicKey(body.owner_pubkey);
    const live = await readVaultByOwner(owner);
    const a = live.accounts;

    let instruction: TransactionInstruction;
    switch (body.action) {
      case "init": {
        if (live.vault) throw new HttpError(409, "VAULT_EXISTS", "This wallet already has a vault");
        const p = body.params;
        if (p.max_per_tx_lamports > p.daily_cap_lamports) {
          throw new HttpError(400, "INVALID_POLICY", "max_per_tx must be <= daily_cap");
        }
        const delegate = p.agent_delegate ? new PublicKey(p.agent_delegate) : agentDelegate().publicKey;
        instruction = ix.initPolicyVault(a, delegate, {
          maxPerTxLamports: p.max_per_tx_lamports,
          dailyCapLamports: p.daily_cap_lamports,
          cooldownSecs: p.cooldown_secs,
          allowlist: p.allowlist.map((k) => new PublicKey(k)),
        });
        break;
      }
      case "deposit":
        if (!live.vault) throw new HttpError(404, "VAULT_NOT_FOUND", "Create the vault first");
        instruction = ix.deposit(a, body.params.amount_lamports);
        break;
      case "update_policy": {
        if (!live.vault) throw new HttpError(404, "VAULT_NOT_FOUND", "Create the vault first");
        const p = body.params;
        if (p.max_per_tx_lamports > p.daily_cap_lamports) {
          throw new HttpError(400, "INVALID_POLICY", "max_per_tx must be <= daily_cap");
        }
        instruction = ix.updatePolicy(
          a,
          {
            maxPerTxLamports: p.max_per_tx_lamports,
            dailyCapLamports: p.daily_cap_lamports,
            cooldownSecs: p.cooldown_secs,
            allowlist: p.allowlist.map((k) => new PublicKey(k)),
          },
          new PublicKey(p.agent_delegate),
        );
        break;
      }
      case "toggle_freeze":
        if (!live.vault) throw new HttpError(404, "VAULT_NOT_FOUND", "Create the vault first");
        instruction = ix.toggleFreeze(a, body.params.frozen);
        break;
      case "withdraw_all":
        if (!live.vault) throw new HttpError(404, "VAULT_NOT_FOUND", "Create the vault first");
        instruction = ix.withdrawAll(a);
        break;
    }

    const { blockhash, lastValidBlockHeight } = await withTimeout(
      connection().getLatestBlockhash("confirmed"),
      8_000,
      "getLatestBlockhash",
    );
    const message = new TransactionMessage({
      payerKey: owner,
      recentBlockhash: blockhash,
      instructions: [instruction],
    }).compileToLegacyMessage();
    const tx = new VersionedTransaction(message);

    const res: OwnerTxResponse = {
      transaction_base64: Buffer.from(tx.serialize()).toString("base64"),
      recent_blockhash: blockhash,
      last_valid_block_height: lastValidBlockHeight,
    };
    return NextResponse.json(res);
  } catch (e) {
    return errorResponse(e);
  }
}
