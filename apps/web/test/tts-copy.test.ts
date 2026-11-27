import { describe, expect, it } from "vitest";

import { copy } from "../lib/tts-copy";

describe("tts copy (PRD §5.2)", () => {
  it("keeps every verdict at 30 words or fewer", () => {
    const samples = [
      copy.passed("Dev3pack Cloud", "Starter Plan", 20_000_000),
      copy.injection(),
      copy.onchainRejected("ExceedsMaxPerTx"),
      copy.onchainRejected("SomethingNew"),
      copy.priceTooHigh(0.2, 0.05),
      copy.missingField(),
      copy.badWallet(),
      copy.frozenOffchain(),
      copy.unknownIntent(),
      copy.emptyTranscript(),
      copy.freezeRequested(),
      copy.frozen(),
      copy.scrapeError(),
      copy.chainError(),
      copy.sttError(),
    ];
    for (const s of samples) expect(s.split(/\s+/).length, s).toBeLessThanOrEqual(30);
  });

  it("formats lamports as SOL", () => {
    expect(copy.passed("V", "P", 20_000_000)).toContain("0.02 SOL");
  });
});
