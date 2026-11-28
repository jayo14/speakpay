import type { AuditRunRow, ClientKind, RunKind, RunStatus, Timings, VoiceCommandResponse } from "@speakpay/shared";

/** One shape for receipts, whether they come from the live result or an Activity row. */
export interface Receipt {
  id: string | null;
  status: RunStatus;
  kind: RunKind;
  client: ClientKind | null;
  created_at: string;
  transcript: string | null;
  scraped_json: Record<string, unknown> | null;
  amount_lamports: number | null;
  recipient_pubkey: string | null;
  tx_signature: string | null;
  evidence_hash: string | null;
  error_code: string | null;
  error_number: number | null;
  speech_text: string | null;
  timings: Timings | null;
}

export function receiptFromRow(r: AuditRunRow): Receipt {
  return {
    id: r.id,
    status: r.status,
    kind: r.kind,
    client: r.client,
    created_at: r.created_at,
    transcript: r.transcript,
    scraped_json: r.scraped_json,
    amount_lamports: r.amount_lamports,
    recipient_pubkey: r.recipient_pubkey,
    tx_signature: r.tx_signature,
    evidence_hash: r.evidence_hash,
    error_code: r.error_code,
    error_number: r.error_number,
    speech_text: r.speech_text,
    timings: r.timings_ms,
  };
}

export function receiptFromVoice(r: VoiceCommandResponse, at: string): Receipt {
  return {
    id: r.run_id || null,
    status: r.status,
    kind: "voice",
    client: "web",
    created_at: at,
    transcript: r.transcript,
    scraped_json: r.scraped_json,
    amount_lamports: r.amount_lamports,
    recipient_pubkey: r.recipient_pubkey,
    tx_signature: r.tx_signature,
    evidence_hash: r.evidence_hash,
    error_code: r.error_code,
    error_number: r.error_number,
    speech_text: r.speech_text,
    timings: r.timings_ms,
  };
}
