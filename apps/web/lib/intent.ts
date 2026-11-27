import type { Intent, Merchant } from "@speakpay/shared";

import { MERCHANTS, merchantUrl } from "./merchants";

// Deterministic intent grammar (PRD §6.2). Input is the TRANSCRIPT ONLY.
// Web content never reaches this module or any LLM.

const UNITS: Record<string, number> = {
  zero: 0, oh: 0, o: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
};
const TEENS_TENS: Record<string, number> = {
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
};

export function normalize(transcript: string): string {
  return transcript
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1$2")
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\.(?!\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parses "0.05", ".05", "zero point zero five" or "point oh five" from the start of `words`. */
export function parseSpokenNumber(words: string[]): { value: number; used: number } | null {
  const first = words[0];
  if (first === undefined) return null;
  if (/^\d*\.?\d+$/.test(first)) return { value: Number(first), used: 1 };

  let i = 0;
  let intPart = 0;
  let sawInt = false;
  const w0 = words[0]!;
  if (w0 in UNITS) {
    intPart = UNITS[w0]!;
    sawInt = true;
    i = 1;
  } else if (w0 in TEENS_TENS) {
    intPart = TEENS_TENS[w0]!;
    sawInt = true;
    i = 1;
  }
  if (words[i] !== "point") {
    return sawInt ? { value: intPart, used: i } : null;
  }
  i += 1;
  let digits = "";
  while (i < words.length && words[i]! in UNITS) {
    digits += String(UNITS[words[i]!]);
    i += 1;
  }
  if (!digits) return null;
  return { value: Number(`${intPart}.${digits}`), used: i };
}

const PRICE_CUE = /\b(under|below|less than|at most|no more than|max|maximum|up to)\b/;
const FREEZE = /\b(freeze|lock)\b.*\b(vault|wallet|account|spending|agent)\b/;
const PAY = /\b(pay|buy|purchase|subscribe|send)\b/;

function findMerchant(text: string): Merchant | null {
  // Longest alias first so "shady deals" wins over "deals".
  const pairs = (Object.keys(MERCHANTS) as Merchant[])
    .flatMap((m) => MERCHANTS[m].aliases.map((a) => [m, a] as const))
    .sort((a, b) => b[1].length - a[1].length);
  for (const [m, alias] of pairs) {
    if (new RegExp(`\\b${alias.replace(/ /g, "\\s+")}\\b`).test(text)) return m;
  }
  return null;
}

function findMaxPrice(text: string): number | null {
  const cue = PRICE_CUE.exec(text);
  if (!cue) return null;
  const after = text.slice(cue.index + cue[0].length).trim().split(" ");
  const n = parseSpokenNumber(after);
  if (!n || !Number.isFinite(n.value) || n.value <= 0) return null;
  const unit = after[n.used];
  // The vault holds SOL: a limit spoken in another currency is not a SOL limit.
  if (unit !== undefined && /^(dollars?|usd|usdc|naira|cents?|bucks?)$/.test(unit)) return null;
  return n.value;
}

export function parseIntent(transcript: string, appUrl: string): Intent {
  const text = normalize(transcript);
  if (FREEZE.test(text)) return { action: "freeze" };

  const merchant = findMerchant(text);
  if (merchant && (PAY.test(text) || /\b(check|verify)\b/.test(text))) {
    return {
      action: "pay",
      merchant,
      target_url: merchantUrl(merchant, appUrl),
      max_price_sol: findMaxPrice(text),
    };
  }
  return { action: "unknown" };
}
