// Evidence hash — PRD §6.6 (LOCKED). Server-only entry: imports node:crypto.

import { createHash } from "node:crypto";

import canonicalize from "canonicalize";

export const EVIDENCE_VERSION = "speakpay:v1";

export interface EvidenceInput {
  vault_pda: string;
  recipient_pubkey: string;
  amount_lamports: number;
  evidence_ts: number; // unix seconds
  transcript: string;
  scraped_json: unknown; // Firecrawl data.json
}

export function evidencePreimage(e: EvidenceInput): string {
  if (!Number.isSafeInteger(e.amount_lamports) || e.amount_lamports < 0) {
    throw new RangeError("amount_lamports must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(e.evidence_ts)) {
    throw new RangeError("evidence_ts must be integer unix seconds");
  }
  const json = canonicalize(e.scraped_json);
  if (json === undefined) throw new TypeError("scraped_json is not JSON-serialisable");
  return [
    EVIDENCE_VERSION,
    e.vault_pda,
    e.recipient_pubkey,
    String(e.amount_lamports),
    String(e.evidence_ts),
    e.transcript,
    json,
  ].join("\n");
}

/** 32 raw bytes, passed to execute_guarded_transfer. */
export function evidenceHashBytes(e: EvidenceInput): Uint8Array {
  return new Uint8Array(createHash("sha256").update(evidencePreimage(e), "utf8").digest());
}

/** 64-char lowercase hex, stored in audit_runs.evidence_hash. */
export function evidenceHashHex(e: EvidenceInput): string {
  return Buffer.from(evidenceHashBytes(e)).toString("hex");
}
