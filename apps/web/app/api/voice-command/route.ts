import { PublicKey } from "@solana/web3.js";
import {
  explorerTxUrl,
  solToLamports,
  type ClientKind,
  type Intent,
  type RunStatus,
  type ScrapedPayment,
  type VoiceCommandResponse,
} from "@speakpay/shared";
import { evidenceHashBytes, evidenceHashHex } from "@speakpay/shared/evidence";
import { NextResponse } from "next/server";

import { insertAuditRun } from "@/lib/audit";
import { ElevenLabsError, speak, transcribe } from "@/lib/elevenlabs";
import { requireEnv } from "@/lib/env";
import { missingFields, scrapeMerchant } from "@/lib/firecrawl";
import { HttpError, errorResponse } from "@/lib/http";
import { resolveIntent } from "@/lib/intent-llm";
import { client as clientSchema, pubkey } from "@/lib/schemas";
import { sendGuardedTransfer } from "@/lib/transfer";
import { copy } from "@/lib/tts-copy";
import { readVaultByPda } from "@/lib/vault";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

// Voice → STT → intent → Firecrawl (injection guard) → prechecks → evidence hash →
// delegate execute_guarded_transfer → Supabase audit row → TTS (PRD §3.1, §6.4).
export async function POST(req: Request) {
  const t0 = Date.now();
  const timings = { stt: 0, scrape: null as number | null, chain: null as number | null, tts: null as number | null, total: 0 };

  try {
    const form = await req.formData().catch(() => {
      throw new HttpError(400, "BAD_REQUEST", "Body must be multipart/form-data");
    });
    const audio = form.get("audio");
    if (!(audio instanceof Blob) || audio.size === 0) throw new HttpError(400, "BAD_REQUEST", "audio file is required");
    if (audio.size > MAX_AUDIO_BYTES) throw new HttpError(413, "AUDIO_TOO_LARGE", "audio must be 5 MB or less");
    const vaultPda = new PublicKey(pubkey.parse(form.get("vault_pda")));
    const ownerPubkey = pubkey.parse(form.get("owner_pubkey"));
    const client: ClientKind = clientSchema.parse(form.get("client"));
    const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");

    const live = await readVaultByPda(vaultPda);
    if (live.vault.owner !== ownerPubkey) throw new HttpError(403, "NOT_VAULT_OWNER", "owner_pubkey does not own this vault");
    const vault = live.vault;

    // Every exit goes through finish(): one real audit row + spoken verdict.
    const finish = async (r: {
      status: RunStatus;
      transcript: string;
      intent: Intent;
      speech: string;
      scraped?: Record<string, unknown> | null;
      targetUrl?: string | null;
      evidenceTs?: number | null;
      evidenceHash?: string | null;
      amount?: number | null;
      recipient?: string | null;
      signature?: string | null;
      errorCode?: string | null;
      errorNumber?: number | null;
      nextAction?: "none" | "sign_freeze";
    }) => {
      const tTts = Date.now();
      const tts = await speak(r.speech);
      timings.tts = Date.now() - tTts;
      timings.total = Date.now() - t0;
      const runId = await insertAuditRun({
        vault_pda: vault.vault_pda,
        client,
        kind: "voice",
        parent_run_id: null,
        transcript: r.transcript,
        intent: r.intent,
        target_url: r.targetUrl ?? null,
        scraped_json: r.scraped ?? null,
        evidence_ts: r.evidenceTs ?? null,
        evidence_hash: r.evidenceHash ?? null,
        status: r.status,
        error_code: r.errorCode ?? null,
        error_number: r.errorNumber ?? null,
        tx_signature: r.signature ?? null,
        amount_lamports: r.amount ?? null,
        recipient_pubkey: r.recipient ?? null,
        speech_text: r.speech,
        timings_ms: timings,
      });
      const res: VoiceCommandResponse = {
        run_id: runId ?? "",
        status: r.status,
        transcript: r.transcript,
        intent: r.intent,
        scraped_json: r.scraped ?? null,
        evidence_hash: r.evidenceHash ?? null,
        amount_lamports: r.amount ?? null,
        recipient_pubkey: r.recipient ?? null,
        tx_signature: r.signature ?? null,
        explorer_url: r.signature ? explorerTxUrl(r.signature) : null,
        // A completed payment is never hidden behind an audit failure (it is still on-chain).
        error_code: runId ? (r.errorCode ?? null) : (r.errorCode ?? "AUDIT_WRITE_FAILED"),
        error_number: r.errorNumber ?? null,
        next_action: r.nextAction ?? "none",
        speech_text: r.speech,
        tts_audio_base64: tts,
        timings_ms: timings,
      };
      return NextResponse.json(res);
    };

    // 1. Speech-to-text (ElevenLabs Scribe).
    let transcript: string;
    const tStt = Date.now();
    try {
      const name = audio instanceof File && audio.name ? audio.name : "command.m4a";
      transcript = await transcribe(audio, name);
    } catch (e) {
      timings.stt = Date.now() - tStt;
      const code = e instanceof ElevenLabsError ? e.code : "STT_FAILED";
      return finish({ status: "ERROR", transcript: "", intent: { action: "unknown" }, speech: copy.sttError(), errorCode: code });
    }
    timings.stt = Date.now() - tStt;
    if (!transcript) {
      return finish({ status: "ERROR", transcript, intent: { action: "unknown" }, speech: copy.emptyTranscript(), errorCode: "EMPTY_TRANSCRIPT" });
    }

    // 2. Intent — transcript only.
    const { intent } = await resolveIntent(transcript, appUrl);
    if (intent.action === "freeze") {
      // Owner-only: the client signs toggle_freeze via MWA, then calls /api/audit/freeze.
      return finish({ status: "FREEZE_REQUESTED", transcript, intent, speech: copy.freezeRequested(), nextAction: "sign_freeze" });
    }
    if (intent.action !== "pay") {
      return finish({ status: "PRECHECK_FAILED", transcript, intent, speech: copy.unknownIntent(), errorCode: "UNKNOWN_INTENT" });
    }

    // 3. Firecrawl live scrape with the injection guard. A 403 stops everything here.
    const tScrape = Date.now();
    const scrape = await scrapeMerchant(intent.target_url);
    timings.scrape = Date.now() - tScrape;
    const base = { transcript, intent, targetUrl: intent.target_url };
    if (scrape.kind === "injection") {
      return finish({
        ...base,
        status: "INJECTION_BLOCKED",
        scraped: { firecrawl_error: scrape.raw } as Record<string, unknown>,
        speech: copy.injection(),
        errorCode: "SCRAPE_PROMPT_INJECTION_DETECTED",
      });
    }
    if (scrape.kind === "error") {
      return finish({ ...base, status: "ERROR", speech: copy.scrapeError(), errorCode: scrape.code });
    }

    // 4. Off-chain prechecks (convenience only — the program is the real boundary).
    const data: ScrapedPayment = scrape.data;
    const scraped = scrape.raw;
    const missing = missingFields(data);
    if (missing.length) {
      return finish({ ...base, status: "PRECHECK_FAILED", scraped, speech: copy.missingField(), errorCode: `MISSING_FIELD_${missing[0]!.toUpperCase()}` });
    }
    let recipient: PublicKey;
    try {
      recipient = new PublicKey(data.recipient_wallet!);
    } catch {
      return finish({ ...base, status: "PRECHECK_FAILED", scraped, speech: copy.badWallet(), errorCode: "INVALID_RECIPIENT" });
    }
    const price = data.price_sol!;
    if (price <= 0) {
      return finish({ ...base, status: "PRECHECK_FAILED", scraped, speech: copy.missingField(), errorCode: "INVALID_PRICE" });
    }
    if (intent.max_price_sol !== null && price > intent.max_price_sol) {
      return finish({ ...base, status: "PRECHECK_FAILED", scraped, speech: copy.priceTooHigh(price, intent.max_price_sol), errorCode: "PRICE_ABOVE_SPOKEN_MAX" });
    }
    const amount = solToLamports(price);
    if (vault.is_frozen) {
      return finish({ ...base, status: "PRECHECK_FAILED", scraped, amount, recipient: recipient.toBase58(), speech: copy.frozenOffchain(), errorCode: "VAULT_FROZEN_OFFCHAIN" });
    }

    // 5. Evidence hash binds transcript + scraped page + payment (PRD §6.6).
    const evidence = {
      vault_pda: vault.vault_pda,
      recipient_pubkey: recipient.toBase58(),
      amount_lamports: amount,
      evidence_ts: Math.floor(Date.now() / 1000),
      transcript,
      scraped_json: scraped,
    };
    const evidenceHash = evidenceHashHex(evidence);
    const paid = { ...base, scraped, amount, recipient: evidence.recipient_pubkey, evidenceTs: evidence.evidence_ts, evidenceHash };

    // 6. Agent delegate executes inside on-chain limits.
    const tChain = Date.now();
    const result = await sendGuardedTransfer({
      programId: live.accounts.programId,
      policyVault: live.accounts.policyVault,
      vaultFunds: live.accounts.vaultFunds,
      recipient,
      amountLamports: amount,
      evidenceHash: evidenceHashBytes(evidence),
      skipPreflight: false,
    });
    timings.chain = Date.now() - tChain;

    if (result.ok) {
      return finish({
        ...paid,
        status: "PASSED",
        signature: result.signature,
        speech: copy.passed(data.vendor_name!, data.plan_name!, amount),
      });
    }
    if (result.policyError) {
      return finish({
        ...paid,
        status: "ONCHAIN_REJECTED",
        signature: result.signature,
        errorCode: result.policyError.name,
        errorNumber: result.policyError.number,
        speech: copy.onchainRejected(result.policyError.name),
      });
    }
    return finish({ ...paid, status: "ERROR", signature: result.signature, errorCode: result.code, speech: copy.chainError() });
  } catch (e) {
    return errorResponse(e);
  }
}
