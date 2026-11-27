import { describe, expect, it } from "vitest";

import { INJECTION_CODE, classifyScrape, missingFields, scrapeRequestBody } from "../lib/firecrawl";

const good = {
  vendor_name: "Dev3pack Cloud",
  plan_name: "Starter Plan",
  price_sol: 0.02,
  recipient_wallet: "US517G5965aydkZ46HS38QLi7UQiSojurfbQfKCELFx",
  terms_summary: "0.02 SOL per month.",
};

describe("Firecrawl request (PRD §5.3)", () => {
  it("uses the top-level injection guard, fresh scrape and v2 json format", () => {
    const b = scrapeRequestBody("https://speakpay.vercel.app/merchants/clean");
    expect(b.checkPromptInjection).toBe(true);
    expect(b.maxAge).toBe(0);
    expect(b.formats).toHaveLength(1);
    expect(b.formats[0]).toMatchObject({ type: "json" });
    expect(b).not.toHaveProperty("jsonOptions");
  });
});

describe("classifyScrape", () => {
  it("returns ok with normalized fields on 200", () => {
    const r = classifyScrape(200, { success: true, data: { json: { ...good, vendor_name: "  Dev3pack Cloud " } } });
    expect(r).toMatchObject({ kind: "ok", data: good });
  });

  it("detects the injection 403 regardless of where the code sits in the body", () => {
    expect(classifyScrape(403, { success: false, code: INJECTION_CODE, error: "blocked" }).kind).toBe("injection");
    expect(classifyScrape(403, { success: false, error: { code: INJECTION_CODE } }).kind).toBe("injection");
  });

  it("treats other failures as errors, never as passes", () => {
    expect(classifyScrape(403, { success: false, error: "forbidden" })).toMatchObject({ kind: "error", code: "FIRECRAWL_403" });
    expect(classifyScrape(402, null)).toMatchObject({ kind: "error", code: "FIRECRAWL_402" });
    expect(classifyScrape(200, { success: false })).toMatchObject({ kind: "error", code: "FIRECRAWL_UNSUCCESSFUL" });
    expect(classifyScrape(200, { success: true, data: {} })).toMatchObject({ kind: "error", code: "FIRECRAWL_NO_JSON" });
  });

  it("reports missing fields so prechecks can stop", () => {
    const r = classifyScrape(200, { success: true, data: { json: { ...good, price_sol: "0.02", recipient_wallet: "" } } });
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(missingFields(r.data)).toEqual(["price_sol", "recipient_wallet"]);
  });
});
