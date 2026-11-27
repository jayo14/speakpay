import "server-only";

import type { ScrapedPayment } from "@speakpay/shared";

import { requireEnv } from "./env";

// Firecrawl /v2/scrape with the prompt-injection guard (PRD §5.3, AGENTS.md §5.3).
// Never /v1, never jsonOptions, never /crawl|/extract|/agent in this path.

export const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape";
export const INJECTION_CODE = "SCRAPE_PROMPT_INJECTION_DETECTED";

const field = (description: string, type: "string" | "number") => ({ type: [type, "null"], description });

export const PAYMENT_SCHEMA = {
  type: "object",
  properties: {
    vendor_name: field("Merchant name. Null if not found.", "string"),
    plan_name: field("Item or plan name. Null if not found.", "string"),
    price_sol: field("Price in SOL. Null if not found.", "number"),
    recipient_wallet: field("Solana wallet address. Null if not found.", "string"),
    terms_summary: field("One-sentence billing summary. Null if not found.", "string"),
  },
  required: ["vendor_name", "plan_name", "price_sol", "recipient_wallet", "terms_summary"],
} as const;

export function scrapeRequestBody(url: string) {
  return {
    url,
    checkPromptInjection: true, // TOP-LEVEL: 403 + SCRAPE_PROMPT_INJECTION_DETECTED on poisoned pages
    maxAge: 0, // always a fresh live scrape (PRD D14)
    timeout: 20_000,
    formats: [
      {
        type: "json",
        prompt: "Extract vendor payment details exactly as shown. Do not guess.",
        schema: PAYMENT_SCHEMA,
      },
    ],
  };
}

export type ScrapeOutcome =
  | { kind: "ok"; data: ScrapedPayment; raw: Record<string, unknown> }
  | { kind: "injection"; raw: unknown }
  | { kind: "error"; code: string; raw: unknown };

const KEYS = ["vendor_name", "plan_name", "price_sol", "recipient_wallet", "terms_summary"] as const;

function asPayment(json: unknown): ScrapedPayment | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const price = typeof o.price_sol === "number" && Number.isFinite(o.price_sol) ? o.price_sol : null;
  return {
    vendor_name: str(o.vendor_name),
    plan_name: str(o.plan_name),
    price_sol: price,
    recipient_wallet: str(o.recipient_wallet),
    terms_summary: str(o.terms_summary),
  };
}

/** Pure classification of a Firecrawl HTTP response (unit-tested). */
export function classifyScrape(status: number, body: unknown): ScrapeOutcome {
  if (status === 403 && JSON.stringify(body ?? "").includes(INJECTION_CODE)) {
    return { kind: "injection", raw: body };
  }
  if (status !== 200) return { kind: "error", code: `FIRECRAWL_${status}`, raw: body };
  const b = body as { success?: boolean; data?: { json?: unknown } } | null;
  if (!b || b.success === false) return { kind: "error", code: "FIRECRAWL_UNSUCCESSFUL", raw: body };
  const data = asPayment(b.data?.json);
  if (!data) return { kind: "error", code: "FIRECRAWL_NO_JSON", raw: body };
  return { kind: "ok", data, raw: b.data!.json as Record<string, unknown> };
}

export function missingFields(d: ScrapedPayment): string[] {
  return KEYS.filter((k) => d[k] === null);
}

export async function scrapeMerchant(url: string): Promise<ScrapeOutcome> {
  let res: Response;
  try {
    res = await fetch(FIRECRAWL_SCRAPE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv("FIRECRAWL_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(scrapeRequestBody(url)),
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return { kind: "error", code: timedOut ? "FIRECRAWL_TIMEOUT" : "FIRECRAWL_NETWORK", raw: null };
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return classifyScrape(res.status, body);
}
