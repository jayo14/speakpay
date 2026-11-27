import { describe, expect, it } from "vitest";

import { describeRun, formatSol, type RunLike } from "../lib/client/describe-run";

const base: RunLike = { status: "PASSED", error_code: null, amount_lamports: 20_000_000, scraped_json: { vendor_name: "Dev3pack Cloud" } };

describe("describeRun (plain-language activity)", () => {
  it("names the merchant and amount for payments", () => {
    expect(describeRun(base)).toMatchObject({ title: "Paid Dev3pack Cloud 0.02 SOL", tone: "paid" });
  });

  it("labels security tests so they are never mistaken for real payments", () => {
    expect(describeRun({ ...base, kind: "rogue", scraped_json: null }).title).toBe("Security test: Paid merchant 0.02 SOL");
    expect(describeRun({ ...base, kind: "rogue", status: "ONCHAIN_REJECTED", error_code: "ExceedsMaxPerTx" })).toMatchObject({
      title: "Security test: Rejected by Solana",
      detail: "Over your per-payment limit · no money moved",
      tone: "blocked",
    });
  });

  it("explains blocks and frozen states in plain words", () => {
    expect(describeRun({ ...base, status: "INJECTION_BLOCKED" }).title).toBe("Blocked a scam page");
    expect(describeRun({ ...base, status: "FROZEN" })).toMatchObject({ title: "Vault frozen", tone: "frozen" });
    expect(describeRun({ ...base, status: "PRECHECK_FAILED", error_code: "MISSING_FIELD_PRICE_SOL" }).detail).toBe(
      "I couldn't verify the price and wallet · nothing sent",
    );
    expect(describeRun({ ...base, status: "ONCHAIN_REJECTED", error_code: "CooldownActive" }).detail).toBe(
      "Too soon after the last payment · no money moved",
    );
  });

  it("formats lamports without trailing zeros", () => {
    expect(formatSol(20_000_000)).toBe("0.02 SOL");
    expect(formatSol(150_000_000)).toBe("0.15 SOL");
  });
});
