// API contracts — PRD §6. Never redeclare these in apps.

import type { PolicyErrorName, RUN_STATUSES } from "./constants";

export type RunStatus = (typeof RUN_STATUSES)[number];
export type ClientKind = "mobile" | "web" | "api";
export type RunKind = "voice" | "rogue" | "freeze";
export type Merchant = "clean" | "shady";

export type Intent =
  | { action: "pay"; merchant: Merchant; target_url: string; max_price_sol: number | null }
  | { action: "freeze" }
  | { action: "unknown" };

/** Firecrawl JSON extraction schema result (PRD §5.3). */
export interface ScrapedPayment {
  vendor_name: string | null;
  plan_name: string | null;
  price_sol: number | null;
  recipient_wallet: string | null;
  terms_summary: string | null;
}

export interface ApiError {
  error: { code: string; message: string };
}

export interface Timings {
  stt: number;
  scrape: number | null;
  chain: number | null;
  tts: number | null;
  total: number;
}

/** POST /api/voice-command (multipart: audio, vault_pda, owner_pubkey, client). */
export interface VoiceCommandResponse {
  run_id: string;
  status: RunStatus;
  transcript: string;
  intent: Intent;
  scraped_json: Record<string, unknown> | null;
  evidence_hash: string | null;
  amount_lamports: number | null;
  recipient_pubkey: string | null;
  tx_signature: string | null;
  explorer_url: string | null;
  error_code: PolicyErrorName | string | null;
  error_number: number | null;
  next_action: "none" | "sign_freeze";
  speech_text: string;
  tts_audio_base64: string | null;
  timings_ms: Timings;
}

/** POST /api/simulate-rogue */
export interface SimulateRogueRequest {
  vault_pda: string;
  amount_lamports: number;
  client: ClientKind;
}
export interface SimulateRogueResponse {
  run_id: string;
  status: RunStatus;
  tx_signature: string | null;
  explorer_url: string | null;
  error_code: PolicyErrorName | string | null;
  error_number: number | null;
  logs: string[];
  speech_text: string;
  tts_audio_base64: string | null;
}

/** POST /api/tx/owner */
export type OwnerAction =
  | {
      action: "init";
      owner_pubkey: string;
      params: {
        max_per_tx_lamports: number;
        daily_cap_lamports: number;
        cooldown_secs: number;
        allowlist: string[];
        agent_delegate?: string; // defaults to the server delegate
      };
    }
  | { action: "deposit"; owner_pubkey: string; params: { amount_lamports: number } }
  | {
      action: "update_policy";
      owner_pubkey: string;
      params: {
        max_per_tx_lamports: number;
        daily_cap_lamports: number;
        cooldown_secs: number;
        allowlist: string[];
        agent_delegate: string;
      };
    }
  | { action: "toggle_freeze"; owner_pubkey: string; params: { frozen: boolean } }
  | { action: "withdraw_all"; owner_pubkey: string; params?: Record<string, never> };

export interface OwnerTxResponse {
  transaction_base64: string;
  recent_blockhash: string;
  last_valid_block_height: number;
}

/** Live PolicyVault account state, decoded (PRD §4.1). */
export interface VaultState {
  vault_pda: string;
  vault_funds_pda: string;
  owner: string;
  agent_delegate: string;
  max_per_tx_lamports: number;
  daily_cap_lamports: number;
  daily_spent_lamports: number;
  window_start_ts: number;
  cooldown_secs: number;
  last_tx_ts: number;
  is_frozen: boolean;
  allowlist: string[];
  last_evidence_hash: string; // hex
  tx_count: number;
}

/** POST /api/vault/sync */
export interface VaultSyncRequest {
  owner_pubkey: string;
  tx_signature: string;
}
export interface VaultSyncResponse {
  vault: VaultState;
}

/** GET /api/vault/[owner] */
export interface VaultReadResponse {
  vault: VaultState | null;
  vault_funds_lamports: number;
  delegate_pubkey: string;
}

/** POST /api/audit/freeze */
export interface AuditFreezeRequest {
  vault_pda: string;
  tx_signature: string;
  client: ClientKind;
  parent_run_id?: string;
}
export interface AuditFreezeResponse {
  run_id: string;
  status: "FROZEN";
  speech_text: string;
  tts_audio_base64: string | null;
}

/** POST /api/tts */
export interface TtsRequest {
  text: string;
}
export interface TtsResponse {
  tts_audio_base64: string | null;
}

/** GET /api/audit/verify/[id] */
export interface AuditVerifyResponse {
  match: boolean;
  recomputed_hash: string;
  onchain_hash: string | null;
  source: "event" | "account";
}

/** GET /api/health — never contains secret values. */
export interface HealthResponse {
  ok: boolean;
  rpc_ok: boolean;
  program_deployed: boolean;
  delegate_balance_lamports: number | null;
  env_missing: string[];
}

/** Row shape of public.audit_runs (PRD §7). */
export interface AuditRunRow {
  id: string;
  vault_pda: string;
  client: ClientKind;
  kind: RunKind;
  parent_run_id: string | null;
  transcript: string | null;
  intent: Intent | null;
  target_url: string | null;
  scraped_json: Record<string, unknown> | null;
  evidence_ts: number | null;
  evidence_hash: string | null;
  status: RunStatus;
  error_code: string | null;
  error_number: number | null;
  tx_signature: string | null;
  amount_lamports: number | null;
  recipient_pubkey: string | null;
  speech_text: string | null;
  timings_ms: Timings | null;
  created_at: string;
}
