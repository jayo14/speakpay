import "server-only";

import type { AuditRunRow } from "@speakpay/shared";

import { supabaseAdmin } from "./supabase-server";

export type NewAuditRun = Omit<AuditRunRow, "id" | "created_at">;

/** Inserts a real audit row (PRD §7) and returns its id, or null if the write failed. */
export async function insertAuditRun(row: NewAuditRun): Promise<string | null> {
  const { data, error } = await supabaseAdmin().from("audit_runs").insert(row).select("id").single();
  if (error || !data) {
    console.error("audit_runs insert failed:", error?.message);
    return null;
  }
  return (data as { id: string }).id;
}
