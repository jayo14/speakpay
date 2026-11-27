// Copy of apps/web/lib/client/describe-run.ts — keep the two identical (one plain-language vocabulary).
import type { RunKind, RunStatus } from "@speakpay/shared";

// One plain-language vocabulary for every run, used by result cards, Activity and receipts.

export type Tone = "paid" | "blocked" | "frozen" | "neutral";

export interface RunLike {
  status: RunStatus;
  kind?: RunKind;
  error_code: string | null;
  amount_lamports: number | null;
  scraped_json: Record<string, unknown> | null;
}

export interface RunDescription {
  title: string;
  detail: string;
  tone: Tone;
}

const REJECTED: Record<string, string> = {
  VaultFrozen: "your vault is frozen",
  ExceedsMaxPerTx: "over your per-payment limit",
  ExceedsDailyCap: "over your daily limit",
  CooldownActive: "too soon after the last payment",
  RecipientNotAllowlisted: "that wallet isn't on your trusted list",
  UnauthorizedAgent: "the agent key isn't allowed on this vault",
  InsufficientVaultBalance: "not enough in your vault",
};

const PRECHECK: Record<string, string> = {
  PRICE_ABOVE_SPOKEN_MAX: "The live price is above the limit you said",
  UNKNOWN_INTENT: "I didn't understand that command",
  VAULT_FROZEN_OFFCHAIN: "Your vault is frozen",
  INVALID_RECIPIENT: "The page lists an invalid wallet",
  INVALID_PRICE: "The page shows an invalid price",
};

export function formatSol(lamports: number): string {
  return `${Number((lamports / 1e9).toFixed(4))} SOL`;
}

export function merchantName(scraped: Record<string, unknown> | null): string | null {
  const v = scraped?.vendor_name;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function describeRun(run: RunLike): RunDescription {
  const amount = run.amount_lamports !== null ? formatSol(run.amount_lamports) : null;
  const merchant = merchantName(run.scraped_json);
  const test = run.kind === "rogue";
  const prefix = test ? "Security test: " : "";

  switch (run.status) {
    case "PASSED":
      return {
        title: `${prefix}Paid ${merchant ?? "merchant"}${amount ? ` ${amount}` : ""}`,
        detail: test ? "Inside your limits, so Solana allowed it" : "Verified page · paid inside your limits",
        tone: "paid",
      };
    case "INJECTION_BLOCKED":
      return { title: "Blocked a scam page", detail: "Hidden instructions found on the page · nothing sent", tone: "blocked" };
    case "ONCHAIN_REJECTED": {
      const why = (run.error_code && REJECTED[run.error_code]) ?? run.error_code ?? "policy rule";
      return { title: `${prefix}Rejected by Solana`, detail: `${why[0]!.toUpperCase()}${why.slice(1)} · no money moved`, tone: "blocked" };
    }
    case "PRECHECK_FAILED": {
      const code = run.error_code ?? "";
      const why = PRECHECK[code] ?? (code.startsWith("MISSING_FIELD") ? "I couldn't verify the price and wallet" : "A check failed");
      return { title: "Not paid", detail: `${why} · nothing sent`, tone: "blocked" };
    }
    case "FREEZE_REQUESTED":
      return { title: "Freeze requested", detail: "Approve it in your wallet", tone: "frozen" };
    case "FROZEN":
      return { title: "Vault frozen", detail: "Your agent can no longer spend", tone: "frozen" };
    case "ERROR":
      return { title: "Something went wrong", detail: `${run.error_code ?? "Unknown error"} · nothing sent`, tone: "neutral" };
  }
}
