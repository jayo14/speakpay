import { PublicKey } from "@solana/web3.js";
import { IX_DISCRIMINATORS, type AuditFreezeResponse } from "@speakpay/shared";
import { NextResponse } from "next/server";
import { z } from "zod";

import { insertAuditRun } from "@/lib/audit";
import { speak } from "@/lib/elevenlabs";
import { HttpError, errorResponse, parseJson } from "@/lib/http";
import { client, pubkey, signature } from "@/lib/schemas";
import { connection, programId } from "@/lib/solana";
import { supabaseAdmin } from "@/lib/supabase-server";
import { withTimeout } from "@/lib/timeout";
import { copy } from "@/lib/tts-copy";
import { readVaultByPda } from "@/lib/vault";

export const runtime = "nodejs";

const body = z.object({ vault_pda: pubkey, tx_signature: signature, client, parent_run_id: z.uuid().optional() });

const isFreezeTrue = (data: Uint8Array) =>
  data.length === 9 && IX_DISCRIMINATORS.toggle_freeze.every((b, i) => data[i] === b) && data[8] === 1;

// T4 — records the owner's voice-triggered freeze, but only after the chain confirms it (PRD §6.4).
export async function POST(req: Request) {
  try {
    const { vault_pda, tx_signature, client: clientKind, parent_run_id } = await parseJson(req, body);

    const existing = await supabaseAdmin()
      .from("audit_runs")
      .select("id, speech_text")
      .eq("tx_signature", tx_signature)
      .maybeSingle();
    if (existing.data) {
      const res: AuditFreezeResponse = {
        run_id: existing.data.id as string,
        status: "FROZEN",
        speech_text: (existing.data.speech_text as string | null) ?? copy.frozen(),
        tts_audio_base64: null,
      };
      return NextResponse.json(res);
    }

    const live = await readVaultByPda(new PublicKey(vault_pda));
    const tx = await withTimeout(
      connection().getTransaction(tx_signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }),
      10_000,
      "getTransaction",
    );
    if (!tx) throw new HttpError(404, "TX_NOT_FOUND", "Transaction not found or not yet confirmed");
    if (tx.meta?.err) throw new HttpError(409, "TX_FAILED", "Freeze transaction failed on-chain");

    const msg = tx.transaction.message;
    const keys = msg.getAccountKeys().staticAccountKeys;
    const owner = new PublicKey(live.vault.owner);
    if (!keys.slice(0, msg.header.numRequiredSignatures).some((k) => k.equals(owner))) {
      throw new HttpError(403, "NOT_OWNER_TX", "Freeze was not signed by this vault's owner");
    }
    const pid = programId();
    const froze = msg.compiledInstructions.some(
      (ix) => keys[ix.programIdIndex]?.equals(pid) && isFreezeTrue(ix.data),
    );
    if (!froze) throw new HttpError(400, "NOT_FREEZE_TX", "Transaction does not call toggle_freeze(true)");
    if (!live.vault.is_frozen) throw new HttpError(409, "NOT_FROZEN", "Vault is not frozen on-chain");

    const speech = copy.frozen();
    const tts = await speak(speech);
    const runId = await insertAuditRun({
      vault_pda: live.vault.vault_pda,
      client: clientKind,
      kind: "freeze",
      parent_run_id: parent_run_id ?? null,
      transcript: null,
      intent: { action: "freeze" },
      target_url: null,
      scraped_json: null,
      evidence_ts: null,
      evidence_hash: null,
      status: "FROZEN",
      error_code: null,
      error_number: null,
      tx_signature,
      amount_lamports: null,
      recipient_pubkey: null,
      speech_text: speech,
      timings_ms: null,
    });
    if (!runId) throw new HttpError(502, "SUPABASE_WRITE_FAILED", "Freeze confirmed on-chain but the audit row failed");

    const res: AuditFreezeResponse = { run_id: runId, status: "FROZEN", speech_text: speech, tts_audio_base64: tts };
    return NextResponse.json(res);
  } catch (e) {
    return errorResponse(e);
  }
}
