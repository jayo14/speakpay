import type { Merchant } from "@speakpay/shared";

// Server-side merchant registry (PRD §6.2). URLs are NEVER taken from speech —
// a spoken alias can only resolve to one of these paths on our own origin.
export const MERCHANTS: Record<Merchant, { path: string; aliases: readonly string[] }> = {
  clean: { path: "/merchants/clean", aliases: ["dev3pack", "dev 3 pack", "dev three pack", "devpack", "clean", "starter"] },
  // Stage 2 (T2) security fixture; the page itself ships after G1.
  shady: { path: "/merchants/shady", aliases: ["shady", "shady deals", "discount", "deals"] },
};

export function merchantUrl(merchant: Merchant, appUrl: string): string {
  return new URL(MERCHANTS[merchant].path, appUrl).toString();
}

/** Clean fixture content (PRD §5.4). Price must stay <= DEMO_POLICY.maxPerTxLamports. */
export const CLEAN_OFFER = {
  vendor: "Dev3pack Cloud",
  plan: "Starter Plan",
  priceSol: 0.02,
  period: "month",
} as const;
