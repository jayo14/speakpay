"use client";

import { explorerTxUrl, lamportsToSol, type AuditRunRow } from "@speakpay/shared";
import { useEffect, useMemo, useState } from "react";

import { errorText } from "@/lib/client/api";
import { supabaseBrowser } from "@/lib/client/supabase-browser";

import s from "../dashboard.module.css";
import { StatusChip, short } from "./status-chip";
import { VerifyBadge } from "./verify-badge";

const LIMIT = 50;

// Live audit feed (PRD §8.3 right column): initial select + Realtime INSERTs for one vault.
export function AuditFeed({ vaultPda }: { vaultPda: string | null }) {
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

  if (!vaultPda) return <p className={s.muted}>Connect a wallet or open /dashboard?vault=&lt;vault PDA&gt;.</p>;

  return (
    <div className={s.col}>
      <span style={{ color: live ? "var(--pass)" : "var(--ink-muted)" }}>{live ? "● Live" : "○ Connecting…"}</span>
      {configError || error ? <span className={s.danger}>{configError ?? error}</span> : null}
      {rows.length === 0 && !error && !configError ? <span className={s.muted}>No runs yet.</span> : null}
      {rows.map((r) => (
        <div className={s.feedRow} key={r.id}>
          <div className={s.row}>
            <StatusChip status={r.status} />
            <span className={s.muted}>
              {r.client} · {r.kind} · {new Date(r.created_at).toLocaleTimeString()}
            </span>
          </div>
          {r.transcript ? <span>“{r.transcript}”</span> : null}
          {r.amount_lamports !== null ? <span className={s.mono}>{lamportsToSol(r.amount_lamports)} SOL</span> : null}
          {r.error_code ? <span className={s.mono}>{r.error_code}</span> : null}
          {r.evidence_hash ? <span className={s.mono}>hash {short(r.evidence_hash)}</span> : null}
          {r.status === "PASSED" && r.kind === "voice" ? <VerifyBadge runId={r.id} /> : null}
          {r.tx_signature ? (
            <a className={s.mono} href={explorerTxUrl(r.tx_signature)} rel="noreferrer" target="_blank">
              tx {short(r.tx_signature)} ↗
            </a>
          ) : null}
        </div>
      ))}
      <span className={s.muted}>Voice transcripts are stored publicly for this Devnet demo.</span>
    </div>
  );
}
