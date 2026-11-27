import type { AuditRunRow, ClientKind, RunKind, RunStatus, Timings, VoiceCommandResponse } from '@speakpay/shared'

/** One shape for receipts, from the live result or an Activity row (mirrors the web app). */
export interface Receipt {
  id: string | null
  status: RunStatus
  kind: RunKind
  client: ClientKind | null
  created_at: string
  transcript: string | null
  scraped_json: Record<string, unknown> | null
  amount_lamports: number | null
  recipient_pubkey: string | null
  tx_signature: string | null
  evidence_hash: string | null
  error_code: string | null
  error_number: number | null
  timings: Timings | null
}

export const receiptFromRow = (r: AuditRunRow): Receipt => ({
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
  timings: r.timings_ms,
})

export const receiptFromVoice = (r: VoiceCommandResponse, at: string): Receipt => ({
  id: r.run_id || null,
  status: r.status,
  kind: 'voice',
  client: 'mobile',
  created_at: at,
  transcript: r.transcript,
  scraped_json: r.scraped_json,
  amount_lamports: r.amount_lamports,
  recipient_pubkey: r.recipient_pubkey,
  tx_signature: r.tx_signature,
  evidence_hash: r.evidence_hash,
  error_code: r.error_code,
  error_number: r.error_number,
  timings: r.timings_ms,
})
