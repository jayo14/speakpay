import { PublicKey } from "@solana/web3.js";
import { findExecutionAudited, type AuditRunRow, type AuditVerifyResponse, type ExecutionAuditedEvent } from "@speakpay/shared";
import { NextResponse } from "next/server";
import { z } from "zod";

import { HttpError, errorResponse } from "@/lib/http";
import { connection } from "@/lib/solana";
import { supabaseAdmin } from "@/lib/supabase-server";
import { withTimeout } from "@/lib/timeout";
import { readVaultByPda } from "@/lib/vault";
import { evidenceMatches, recomputeHash } from "@/lib/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// T3 — anyone can re-derive a receipt's hash and compare it with what Solana recorded (PRD §6.6).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = z.uuid().parse((await ctx.params).id);
    const { data, error } = await supabaseAdmin().from("audit_runs").select("*").eq("id", id).maybeSingle();
    if (error) throw new HttpError(502, "SUPABASE_READ_FAILED", error.message);
    if (!data) throw new HttpError(404, "RUN_NOT_FOUND", "No audit run with this id");
    const row = data as AuditRunRow;
    if (row.status !== "PASSED" || !row.tx_signature || !row.evidence_hash) {
      throw new HttpError(409, "NOT_VERIFIABLE", "Only PASSED voice payments carry an evidence hash");
    }

    const recomputed = recomputeHash(row);
    let event: ExecutionAuditedEvent | null = null;
    let source: AuditVerifyResponse["source"] = "event";

    const tx = await withTimeout(
      connection().getTransaction(row.tx_signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }),
      10_000,
      "getTransaction",
    ).catch(() => null);
    if (tx?.meta && !tx.meta.err) event = findExecutionAudited(tx.meta.logMessages ?? []);

    if (!event) {
      // Fallback: the account only remembers the latest hash, so this can only confirm the newest payment.
      const live = await readVaultByPda(new PublicKey(row.vault_pda));
      source = "account";
      event = {
        vault: live.vault.vault_pda,
        recipient: row.recipient_pubkey ?? "",
        amount_lamports: Number(row.amount_lamports),
        evidence_hash: live.vault.last_evidence_hash,
        daily_spent_lamports: live.vault.daily_spent_lamports,
        tx_count: live.vault.tx_count,
        ts: live.vault.last_tx_ts,
      };
    }

    const res: AuditVerifyResponse = {
      match: evidenceMatches(row, recomputed, event),
      recomputed_hash: recomputed ?? "",
      onchain_hash: event.evidence_hash,
      source,
    };
    return NextResponse.json(res);
  } catch (e) {
    return errorResponse(e);
  }
}
