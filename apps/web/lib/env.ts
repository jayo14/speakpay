import "server-only";

// Server env inventory — ENVIRONMENT.md §1.2. Values are never returned to clients.

export const REQUIRED_SERVER_ENV = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SOLANA_CLUSTER",
  "NEXT_PUBLIC_POLICY_VAULT_PROGRAM_ID",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SOLANA_RPC_URL",
  "AGENT_DELEGATE_SECRET_KEY",
  "MERCHANT_CLEAN_WALLET",
  "MERCHANT_SHADY_ATTACKER_WALLET",
  "FIRECRAWL_API_KEY",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_VOICE_ID",
  "ELEVENLABS_STT_MODEL_ID",
  "ELEVENLABS_TTS_MODEL_ID",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export type ServerEnvName = (typeof REQUIRED_SERVER_ENV)[number];

/** Names (never values) of required variables that are unset or empty. */
export function missingEnv(): string[] {
  const missing: string[] = REQUIRED_SERVER_ENV.filter((k) => !process.env[k]?.trim());
  if (process.env.INTENT_LLM_ENABLED === "true" && !process.env.ANTHROPIC_API_KEY?.trim()) {
    missing.push("ANTHROPIC_API_KEY");
  }
  return missing;
}

export class MissingEnvError extends Error {
  constructor(public readonly variable: string) {
    super(`Missing required environment variable ${variable}`);
    this.name = "MissingEnvError";
  }
}

export function requireEnv(name: ServerEnvName | "ANTHROPIC_API_KEY"): string {
  const v = process.env[name]?.trim();
  if (!v) throw new MissingEnvError(name);
  return v;
}

export function flag(name: "ROGUE_SIM_ENABLED" | "INTENT_LLM_ENABLED"): boolean {
  return process.env[name] === "true";
}
