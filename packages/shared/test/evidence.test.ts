import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { evidenceHashBytes, evidenceHashHex, evidencePreimage, type EvidenceInput } from "../src/evidence";

const input: EvidenceInput = {
  vault_pda: "DNpZ7WfN9vCzjvQ81mU1jXmeNEzxLEPkD4Yhao9RT1zo",
  recipient_pubkey: "US517G5965aydkZ46HS38QLi7UQiSojurfbQfKCELFx",
  amount_lamports: 20_000_000,
  evidence_ts: 1_800_000_000,
  transcript: "Check the Dev3pack merchant page — pay them.",
  scraped_json: { vendor_name: "Dev3pack Cloud", price_sol: 0.02, plan_name: "Starter Plan" },
};

describe("evidence hash (PRD §6.6)", () => {
  it("builds the locked preimage with RFC 8785 canonical JSON", () => {
    expect(evidencePreimage(input)).toBe(
      [
        "speakpay:v1",
        input.vault_pda,
        input.recipient_pubkey,
        "20000000",
        "1800000000",
        input.transcript,
        '{"plan_name":"Starter Plan","price_sol":0.02,"vendor_name":"Dev3pack Cloud"}',
      ].join("\n"),
    );
  });

  it("is independent of JSON key order", () => {
    const reordered = { ...input, scraped_json: { price_sol: 0.02, plan_name: "Starter Plan", vendor_name: "Dev3pack Cloud" } };
    expect(evidenceHashHex(reordered)).toBe(evidenceHashHex(input));
  });

  it("is SHA-256 of the UTF-8 preimage, 32 bytes / 64 hex", () => {
    const expected = createHash("sha256").update(evidencePreimage(input), "utf8").digest("hex");
    expect(evidenceHashHex(input)).toBe(expected);
    expect(evidenceHashBytes(input)).toHaveLength(32);
    expect(evidenceHashHex(input)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when any byte of the transcript changes", () => {
    expect(evidenceHashHex({ ...input, transcript: input.transcript + " " })).not.toBe(evidenceHashHex(input));
  });

  it("rejects non-integer amounts and timestamps", () => {
    expect(() => evidencePreimage({ ...input, amount_lamports: 0.5 })).toThrow(RangeError);
    expect(() => evidencePreimage({ ...input, evidence_ts: 1.5 })).toThrow(RangeError);
  });
});
