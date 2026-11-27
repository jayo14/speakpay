"use client";

import type { AuditRunRow } from "@speakpay/shared";
import { useEffect, useMemo, useState } from "react";

import { errorText } from "@/lib/client/api";
import { supabaseBrowser } from "@/lib/client/supabase-browser";

const LIMIT = 50;

/** Last 50 runs for a vault, then live INSERTs via Supabase Realtime (PRD §8.3). */
export function useAuditFeed(vaultPda: string | null) {
  const [rows, setRows] = useState<AuditRunRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const configError = useMemo(() => {
    try {
      supabaseBrowser();
      return null;
    } catch (e) {
      return errorText(e);
    }
  }, []);

  useEffect(() => {
    if (!vaultPda || configError) return;
    let cancelled = false;
    const sb = supabaseBrowser();

    void sb
      .from("audit_runs")
      .select("*")
      .eq("vault_pda", vaultPda)
      .order("created_at", { ascending: false })
      .limit(LIMIT)
      .then(({ data, error: e }) => {
        if (cancelled) return;
        if (e) setError(e.message);
        else setRows((data ?? []) as AuditRunRow[]);
      });

    const channel = sb
      .channel(`audit_runs:${vaultPda}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_runs", filter: `vault_pda=eq.${vaultPda}` },
        (payload) => {
          const row = payload.new as AuditRunRow;
          setRows((prev) => (prev.some((r) => r.id === row.id) ? prev : [row, ...prev].slice(0, LIMIT)));
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      cancelled = true;
      void sb.removeChannel(channel);
    };
  }, [vaultPda, configError]);

  return { rows: vaultPda ? rows : [], error: configError ?? error, live: !!vaultPda && live };
}
