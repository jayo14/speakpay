import { describe, expect, it } from "vitest";

import type { VaultState } from "../src/api-types";
import { DEMO_PAYMENT_FITS_POLICY, demoReadiness } from "../src/readiness";

const NOW = 1_800_000_000;
const vault: VaultState = {
  vault_pda: "v",
  vault_funds_pda: "f",
  owner: "o",
  agent_delegate: "d",
  max_per_tx_lamports: 50_000_000,
  daily_cap_lamports: 150_000_000,
  daily_spent_lamports: 0,
  window_start_ts: NOW - 100,
  cooldown_secs: 30,
  last_tx_ts: 0,
  is_frozen: false,
  allowlist: [],
  last_evidence_hash: "00".repeat(32),
  tx_count: 0,
};
const ok = (v: VaultState, funds = 200_000_000, delegate: number | null = 100_000_000, now = NOW) =>
  Object.fromEntries(demoReadiness(v, funds, delegate, now).map((c) => [c.id, c.ok]));

describe("demoReadiness (PRD §2 pre-demo reset)", () => {
  it("is all green for a fresh funded vault", () => {
    expect(Object.values(ok(vault)).every(Boolean)).toBe(true);
    expect(DEMO_PAYMENT_FITS_POLICY).toBe(true);
  });

  it("flags frozen vaults, low balances and unknown delegate balance", () => {
    expect(ok({ ...vault, is_frozen: true }).unfrozen).toBe(false);
    expect(ok(vault, 99_999_999).vault_balance).toBe(false);
    expect(ok(vault, 200_000_000, 1).delegate_balance).toBe(false);
    expect(ok(vault, 200_000_000, null).delegate_balance).toBe(false);
  });

  it("tracks cooldown to the second", () => {
    expect(ok({ ...vault, last_tx_ts: NOW - 29 }).cooldown).toBe(false);
    expect(ok({ ...vault, last_tx_ts: NOW - 30 }).cooldown).toBe(true);
  });

  it("checks daily cap room, and resets after 24 h like the program", () => {
    const full = { ...vault, daily_spent_lamports: 140_000_000 };
    expect(ok(full).daily_cap).toBe(false);
    expect(ok({ ...full, daily_spent_lamports: 130_000_000 }).daily_cap).toBe(true);
    expect(ok(full, 200_000_000, 100_000_000, vault.window_start_ts + 86_400).daily_cap).toBe(true);
  });
});
