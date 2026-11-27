import type { AuditRunRow, ExecutionAuditedEvent } from "@speakpay/shared";
import { evidenceHashHex } from "@speakpay/shared/evidence";

export type VerifyRow = Pick<
  AuditRunRow,
  "vault_pda" | "recipient_pubkey" | "amount_lamports" | "evidence_ts" | "transcript" | "scraped_json" | "evidence_hash"
>;

/** Recomputes the PRD §6.6 hash from the stored preimage fields, or null if any is missing. */
export function recomputeHash(row: VerifyRow): string | null {
  if (!row.recipient_pubkey || row.amount_lamports === null || row.evidence_ts === null || row.transcript === null || !row.scraped_json) {
    return null;
  }
  return evidenceHashHex({
    vault_pda: row.vault_pda,
    recipient_pubkey: row.recipient_pubkey,
    amount_lamports: Number(row.amount_lamports),
    evidence_ts: Number(row.evidence_ts),
    transcript: row.transcript,
    scraped_json: row.scraped_json,
  });
}

/**
 * Receipt ↔ chain check: the recomputed hash must equal the stored hash AND the on-chain
 * ExecutionAudited hash, and the event must describe the same vault, recipient and amount.
 */
export function evidenceMatches(row: VerifyRow, recomputed: string | null, event: ExecutionAuditedEvent | null): boolean {
  if (!recomputed || !event) return false;
  return (
    recomputed === row.evidence_hash &&
    recomputed === event.evidence_hash &&
    event.vault === row.vault_pda &&
    event.recipient === row.recipient_pubkey &&
    event.amount_lamports === Number(row.amount_lamports)
  );
}
