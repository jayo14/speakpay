import type { ExecutionAuditedEvent } from "@speakpay/shared";
import { describe, expect, it } from "vitest";

import { evidenceMatches, recomputeHash, type VerifyRow } from "../lib/verify";

const base: Omit<VerifyRow, "evidence_hash"> = {
  vault_pda: "DNpZ7WfN9vCzjvQ81mU1jXmeNEzxLEPkD4Yhao9RT1zo",
  recipient_pubkey: "US517G5965aydkZ46HS38QLi7UQiSojurfbQfKCELFx",
  amount_lamports: 20_000_000,
  evidence_ts: 1_800_000_000,
  transcript: "Check the Dev3pack merchant page — pay them.",
  scraped_json: { vendor_name: "Dev3pack Cloud", price_sol: 0.02 },
};
const hash = recomputeHash({ ...base, evidence_hash: null })!;
const row: VerifyRow = { ...base, evidence_hash: hash };
const event: ExecutionAuditedEvent = {
  vault: base.vault_pda,
  recipient: base.recipient_pubkey!,
  amount_lamports: 20_000_000,
  evidence_hash: hash,
  daily_spent_lamports: 20_000_000,
  tx_count: 1,
  ts: 1_800_000_001,
};

describe("evidence verification (T3)", () => {
  it("matches when receipt, recomputation and on-chain event agree", () => {
    expect(evidenceMatches(row, recomputeHash(row), event)).toBe(true);
  });

  it("survives jsonb key reordering (RFC 8785 canonical JSON)", () => {
    const reordered = { ...row, scraped_json: { price_sol: 0.02, vendor_name: "Dev3pack Cloud" } };
    expect(evidenceMatches(reordered, recomputeHash(reordered), event)).toBe(true);
  });

  it("fails if one character of the stored transcript changes", () => {
    const tampered = { ...row, transcript: row.transcript + "!" };
    expect(evidenceMatches(tampered, recomputeHash(tampered), event)).toBe(false);
  });

  it("fails if the hash belongs to a different transfer", () => {
    expect(evidenceMatches(row, recomputeHash(row), { ...event, amount_lamports: 50_000_000 })).toBe(false);
    expect(evidenceMatches(row, recomputeHash(row), { ...event, recipient: base.vault_pda })).toBe(false);
  });

  it("fails without an on-chain event or preimage fields", () => {
    expect(evidenceMatches(row, recomputeHash(row), null)).toBe(false);
    expect(recomputeHash({ ...row, scraped_json: null })).toBeNull();
  });
});
