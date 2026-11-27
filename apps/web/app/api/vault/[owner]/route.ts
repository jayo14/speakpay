import { PublicKey } from "@solana/web3.js";
import type { VaultReadResponse } from "@speakpay/shared";
import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/http";
import { pubkey } from "@/lib/schemas";
import { agentDelegate } from "@/lib/solana";
import { readVaultByOwner } from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Live chain read of the owner's vault (source of truth; PRD §6.4).
export async function GET(_req: Request, ctx: { params: Promise<{ owner: string }> }) {
  try {
    const owner = pubkey.parse((await ctx.params).owner);
    const live = await readVaultByOwner(new PublicKey(owner));
    const res: VaultReadResponse = {
      vault: live.vault,
      vault_funds_lamports: live.vault_funds_lamports,
      delegate_pubkey: agentDelegate().publicKey.toBase58(),
    };
    return NextResponse.json(res);
  } catch (e) {
    return errorResponse(e);
  }
}
