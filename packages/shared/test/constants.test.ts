import { describe, expect, it } from "vitest";

import { DEMO_POLICY, policyErrorCode, policyErrorName, solToLamports } from "../src/constants";

describe("constants", () => {
  it("maps PolicyError codes exactly as PRD §4.4", () => {
    expect(policyErrorName(6000)).toBe("VaultFrozen");
    expect(policyErrorName(6001)).toBe("ExceedsMaxPerTx");
    expect(policyErrorName(6006)).toBe("InsufficientVaultBalance");
    expect(policyErrorName(6009)).toBe("MathOverflow");
    expect(policyErrorName(6010)).toBeNull();
    expect(policyErrorCode("ExceedsMaxPerTx")).toBe(0x1771);
  });

  it("keeps demo policy internally consistent", () => {
    expect(DEMO_POLICY.maxPerTxLamports).toBeLessThanOrEqual(DEMO_POLICY.dailyCapLamports);
    expect(DEMO_POLICY.roguePayLamports).toBeGreaterThan(DEMO_POLICY.maxPerTxLamports);
    expect(DEMO_POLICY.rogueCompliantLamports).toBeLessThanOrEqual(DEMO_POLICY.maxPerTxLamports);
    expect(solToLamports(0.02)).toBe(20_000_000);
    expect(solToLamports(0.05)).toBe(DEMO_POLICY.maxPerTxLamports);
  });
});
