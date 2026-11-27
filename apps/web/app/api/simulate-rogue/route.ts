import { PublicKey } from "@solana/web3.js";
import { explorerTxUrl, type SimulateRogueResponse } from "@speakpay/shared";
import { NextResponse } from "next/server";
import { z } from "zod";

import { insertAuditRun } from "@/lib/audit";
import { speak } from "@/lib/elevenlabs";
import { flag, requireEnv } from "@/lib/env";
import { HttpError, errorResponse, parseJson } from "@/lib/http";
import { client, lamports, pubkey } from "@/lib/schemas";
import { sendGuardedTransfer } from "@/lib/transfer";
import { copy } from "@/lib/tts-copy";
import { readVaultByPda } from "@/lib/vault";

export const runtime = "nodejs";
export const maxDuration = 60;

const body = z.object({ vault_pda: pubkey, amount_lamports: lamports.positive(), client });

// T1 — Layer 2 proof (PRD §2 Proof 3, D9). Simulates a fully compromised agent: the delegate key
// signs execute_guarded_transfer directly — no voice, no LLM, no Firecrawl, no off-chain prechecks —
// and preflight is skipped so the validator itself executes and records the outcome on-chain.
export async function POST(req: Request) {
  try {
    if (!flag("ROGUE_SIM_ENABLED")) throw new HttpError(403, "ROGUE_SIM_DISABLED", "Rogue simulation is disabled");
    const { vault_pda, amount_lamports, client: clientKind } = await parseJson(req, body);
    const live = await readVaultByPda(new PublicKey(vault_pda));
    const recipient = new PublicKey(requireEnv("MERCHANT_CLEAN_WALLET"));

    const result = await sendGuardedTransfer({
      programId: live.accounts.programId,
      policyVault: live.accounts.policyVault,
      vaultFunds: live.accounts.vaultFunds,
      recipient,
      amountLamports: amount_lamports,
      evidenceHash: new Uint8Array(32), // no evidence: this is the attack
      skipPreflight: true,
    });

    const status = result.ok ? "PASSED" : result.policyError ? "ONCHAIN_REJECTED" : "ERROR";
    const errorCode = result.ok ? null : (result.policyError?.name ?? result.code);
    const speech = result.ok
      ? copy.roguePassed(amount_lamports)
      : result.policyError
        ? copy.onchainRejected(result.policyError.name)
        : copy.chainError();

    const tts = await speak(speech);
    const runId = await insertAuditRun({
      vault_pda: live.vault.vault_pda,
      client: clientKind,
      kind: "rogue",
      parent_run_id: null,
      transcript: null,
      intent: null,
      target_url: null,
      scraped_json: null,
      evidence_ts: null,
      evidence_hash: null,
      status,
      error_code: errorCode,
      error_number: result.ok ? null : (result.policyError?.number ?? null),
      tx_signature: result.signature,
      amount_lamports,
      recipient_pubkey: recipient.toBase58(),
      speech_text: speech,
      timings_ms: null,
    });

    const res: SimulateRogueResponse = {
      run_id: runId ?? "",
      status,
      tx_signature: result.signature,
      explorer_url: result.signature ? explorerTxUrl(result.signature) : null,
      error_code: runId ? errorCode : (errorCode ?? "AUDIT_WRITE_FAILED"),
      error_number: result.ok ? null : (result.policyError?.number ?? null),
      logs: result.logs,
      speech_text: speech,
      tts_audio_base64: tts,
    };
    return NextResponse.json(res);
  } catch (e) {
    return errorResponse(e);
  }
}
