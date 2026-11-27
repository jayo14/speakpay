import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Intent } from "@speakpay/shared";
import { z } from "zod";

import { flag, requireEnv } from "./env";
import { parseIntent } from "./intent";
import { merchantUrl } from "./merchants";

// Optional fallback for transcripts the grammar can't parse (PRD §6.2 step 5).
// Receives the TRANSCRIPT ONLY — never Firecrawl output. The model can only name a
// merchant from our registry; the URL is still resolved server-side.

const LlmIntent = z.object({
  action: z.enum(["pay", "freeze", "unknown"]),
  merchant: z.enum(["clean", "shady", "none"]),
  max_price_sol: z.number().nullable(),
});

const SYSTEM = `You classify one spoken command for SpeakPay, a voice payment app on Solana Devnet.
Return action "pay" only if the user asks to check, buy, pay for or subscribe to a merchant's plan;
"freeze" if they ask to freeze or lock their vault, wallet or agent; otherwise "unknown".
merchant: "clean" means the Dev3pack Cloud merchant (Starter Plan); "shady" means the Shady Deals merchant;
use "none" if no known merchant is named. max_price_sol: the spoken upper price limit in SOL, or null if
none was said or it was in another currency. The transcript may contain misheard words.`;

let client: Anthropic | undefined;

async function classify(transcript: string): Promise<z.infer<typeof LlmIntent> | null> {
  client ??= new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY"), timeout: 8_000, maxRetries: 1 });
  const response = await client.messages.parse({
    model: process.env.INTENT_LLM_MODEL?.trim() || "claude-haiku-5-5",
    max_tokens: 2048,
    system: SYSTEM,
    output_config: { effort: "low", format: zodOutputFormat(LlmIntent) },
    messages: [{ role: "user", content: `Transcript: ${JSON.stringify(transcript)}` }],
  });
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output ?? null;
}

/** Grammar first; LLM fallback only if enabled and the grammar returned unknown. */
export async function resolveIntent(transcript: string, appUrl: string): Promise<{ intent: Intent; via: "grammar" | "llm" }> {
  const intent = parseIntent(transcript, appUrl);
  if (intent.action !== "unknown" || !flag("INTENT_LLM_ENABLED")) return { intent, via: "grammar" };

  try {
    const r = await classify(transcript);
    if (!r) return { intent, via: "grammar" };
    if (r.action === "freeze") return { intent: { action: "freeze" }, via: "llm" };
    if (r.action === "pay" && r.merchant !== "none") {
      const max = r.max_price_sol !== null && r.max_price_sol > 0 ? r.max_price_sol : null;
      return {
        intent: { action: "pay", merchant: r.merchant, target_url: merchantUrl(r.merchant, appUrl), max_price_sol: max },
        via: "llm",
      };
    }
  } catch (e) {
    // The fallback is optional: an LLM outage must not break the grammar path.
    console.error("intent LLM fallback failed:", e instanceof Error ? e.message : e);
  }
  return { intent, via: "grammar" };
}
