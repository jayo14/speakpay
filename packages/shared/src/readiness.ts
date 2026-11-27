// Pre-demo reset checklist (PRD §2) as data, so phone and web show the same live checks.

import { DEMO_POLICY, lamportsToSol } from "./constants";
import type { VaultState } from "./api-types";

export interface ReadinessCheck {
  id: "unfrozen" | "vault_balance" | "delegate_balance" | "cooldown" | "daily_cap";
  ok: boolean;
  label: string;
  detail: string;
}

export const READINESS = {
  minVaultLamports: 100_000_000, // 0.10 SOL
  minDelegateLamports: 50_000_000, // 0.05 SOL for fees + rogue tests
  demoPaymentLamports: 20_000_000, // clean Starter Plan, 0.02 SOL
} as const;

const SECONDS_PER_DAY = 86_400;

export function demoReadiness(
  vault: VaultState,
  vaultFundsLamports: number,
  delegateLamports: number | null,
  nowSecs: number,
): ReadinessCheck[] {
  const windowOpen = nowSecs - vault.window_start_ts < SECONDS_PER_DAY;
  const spent = windowOpen ? vault.daily_spent_lamports : 0;
  const cooldownLeft = vault.last_tx_ts === 0 ? 0 : Math.max(0, vault.last_tx_ts + vault.cooldown_secs - nowSecs);
  const sol = (l: number) => `${lamportsToSol(l)} SOL`;

  return [
    {
      id: "unfrozen",
      ok: !vault.is_frozen,
      label: "Vault unfrozen",
      detail: vault.is_frozen ? "Unfreeze before recording" : "Agent can spend",
    },
    {
      id: "vault_balance",
      ok: vaultFundsLamports >= READINESS.minVaultLamports,
      label: `Vault balance ≥ ${sol(READINESS.minVaultLamports)}`,
      detail: sol(vaultFundsLamports),
    },
    {
      id: "delegate_balance",
      ok: delegateLamports !== null && delegateLamports >= READINESS.minDelegateLamports,
      label: `Agent delegate ≥ ${sol(READINESS.minDelegateLamports)} for fees`,
      detail: delegateLamports === null ? "unknown" : sol(delegateLamports),
    },
    {
      id: "cooldown",
      ok: cooldownLeft === 0,
      label: "Cooldown elapsed",
      detail: cooldownLeft === 0 ? "ready" : `${cooldownLeft}s left`,
    },
    {
      id: "daily_cap",
      ok: spent + READINESS.demoPaymentLamports <= vault.daily_cap_lamports,
      label: `Room for a ${sol(READINESS.demoPaymentLamports)} payment today`,
      detail: `${sol(spent)} of ${sol(vault.daily_cap_lamports)} spent`,
    },
  ];
}

/** Sanity: the demo payment must itself fit the demo policy. */
export const DEMO_PAYMENT_FITS_POLICY = READINESS.demoPaymentLamports <= DEMO_POLICY.maxPerTxLamports;
