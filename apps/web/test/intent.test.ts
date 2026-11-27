import { describe, expect, it } from "vitest";

import { normalize, parseIntent, parseSpokenNumber } from "../lib/intent";

const APP = "https://speakpay.vercel.app";
const CLEAN = `${APP}/merchants/clean`;

describe("parseIntent (PRD §6.2)", () => {
  it("parses the canonical demo command", () => {
    expect(
      parseIntent("Check the Dev3pack merchant page — if the Starter Plan is under 0.05 SOL, pay them.", APP),
    ).toEqual({ action: "pay", merchant: "clean", target_url: CLEAN, max_price_sol: 0.05 });
  });

  it("handles STT spellings of Dev3pack and spoken numbers", () => {
    expect(parseIntent("check the dev three pack page and pay if it's under zero point zero five sol", APP)).toEqual({
      action: "pay",
      merchant: "clean",
      target_url: CLEAN,
      max_price_sol: 0.05,
    });
    expect(parseIntent("Pay Dev 3 Pack, max .05 SOL.", APP)).toMatchObject({ merchant: "clean", max_price_sol: 0.05 });
  });

  it("routes the shady merchant only to our own fixture URL", () => {
    expect(parseIntent("Check the Shady Deals merchant page and pay for the discount plan.", APP)).toEqual({
      action: "pay",
      merchant: "shady",
      target_url: `${APP}/merchants/shady`,
      max_price_sol: null,
    });
  });

  it("never takes a URL from speech", () => {
    const i = parseIntent("pay https://evil.example.com dev3pack under 1 sol", APP);
    expect(i).toMatchObject({ target_url: CLEAN });
  });

  it("detects the voice kill switch", () => {
    expect(parseIntent("Freeze my vault.", APP)).toEqual({ action: "freeze" });
    expect(parseIntent("lock the agent now", APP)).toEqual({ action: "freeze" });
  });

  it("returns unknown for unrelated speech or unknown merchants", () => {
    expect(parseIntent("what's the weather", APP)).toEqual({ action: "unknown" });
    expect(parseIntent("pay amazon under 0.05 sol", APP)).toEqual({ action: "unknown" });
  });

  it("ignores limits spoken in other currencies", () => {
    expect(parseIntent("pay dev3pack under 5 dollars", APP)).toMatchObject({ max_price_sol: null });
  });
});

describe("helpers", () => {
  it("normalize keeps decimals, drops punctuation", () => {
    expect(normalize("Under 0.05 SOL, pay them.")).toBe("under 0.05 sol pay them");
  });
  it("parseSpokenNumber", () => {
    expect(parseSpokenNumber(["0.02", "sol"])).toEqual({ value: 0.02, used: 1 });
    expect(parseSpokenNumber(["zero", "point", "zero", "two", "sol"])).toEqual({ value: 0.02, used: 4 });
    expect(parseSpokenNumber(["point", "oh", "five"])).toEqual({ value: 0.05, used: 3 });
    expect(parseSpokenNumber(["sol"])).toBeNull();
  });
});
