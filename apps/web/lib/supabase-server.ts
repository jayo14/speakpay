import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireEnv } from "./env";

let client: SupabaseClient | undefined;

/** Service-role client: the only writer to vault_profiles / audit_runs (PRD §7). */
export function supabaseAdmin(): SupabaseClient {
  client ??= createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
