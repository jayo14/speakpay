// Locked constants shared by web, mobile and tests (PRD §2, §4, §6).

export const POLICY_VAULT_SEED = "policy_vault";
export const VAULT_FUNDS_SEED = "vault_funds";

export const LAMPORTS_PER_SOL = 1_000_000_000;
export const MAX_ALLOWLIST = 5;

/** Demo policy from PRD §2. Values in lamports / seconds. */
export const DEMO_POLICY = {
  maxPerTxLamports: 50_000_000, // 0.05 SOL
  dailyCapLamports: 150_000_000, // 0.15 SOL
  cooldownSecs: 30,
  depositLamports: 200_000_000, // 0.20 SOL
  roguePayLamports: 500_000_000, // 0.50 SOL -> ExceedsMaxPerTx
  rogueCompliantLamports: 10_000_000, // 0.01 SOL -> VaultFrozen after freeze
} as const;

export function solToLamports(sol: number): number {
  if (!Number.isFinite(sol) || sol < 0) throw new RangeError(`invalid SOL amount: ${sol}`);
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

/** PolicyError (PRD §4.4). Code = 6000 + index. Append only. */
export const POLICY_ERRORS = [
  "VaultFrozen",
  "ExceedsMaxPerTx",
  "ExceedsDailyCap",
  "CooldownActive",
  "RecipientNotAllowlisted",
  "UnauthorizedAgent",
  "InsufficientVaultBalance",
  "AllowlistTooLong",
  "InvalidPolicy",
  "MathOverflow",
] as const;

export type PolicyErrorName = (typeof POLICY_ERRORS)[number];
export const POLICY_ERROR_OFFSET = 6000;

export function policyErrorName(code: number): PolicyErrorName | null {
  return POLICY_ERRORS[code - POLICY_ERROR_OFFSET] ?? null;
}

export function policyErrorCode(name: PolicyErrorName): number {
  return POLICY_ERROR_OFFSET + POLICY_ERRORS.indexOf(name);
}

export const RUN_STATUSES = [
  "PASSED",
  "INJECTION_BLOCKED",
  "ONCHAIN_REJECTED",
  "FROZEN",
  "FREEZE_REQUESTED",
  "PRECHECK_FAILED",
  "ERROR",
] as const;

export type Cluster = "devnet";

export function explorerTxUrl(signature: string, cluster: Cluster = "devnet"): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

export function explorerAddressUrl(address: string, cluster: Cluster = "devnet"): string {
  return `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
}
