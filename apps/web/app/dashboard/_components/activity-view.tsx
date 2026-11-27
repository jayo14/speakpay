"use client";

import { ReceiptText } from "lucide-react";
import { useState } from "react";

import { describeRun, formatSol } from "@/lib/client/describe-run";

import s from "../dashboard.module.css";
import { receiptFromRow, type Receipt } from "./receipt";
import { ReceiptSheet } from "./receipt-sheet";
import { ToneIcon } from "./status-chip";
import { useAuditFeed } from "./use-audit-feed";

function timeLabel(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString([], { day: "numeric", month: "short" });
}

// Activity (history): every payment, block and freeze, in plain language. Tap a row for its receipt.
export function ActivityView({ vaultPda }: { vaultPda: string | null }) {
  const feed = useAuditFeed(vaultPda);
  const [open, setOpen] = useState<Receipt | null>(null);

  if (!vaultPda) {
    return (
      <div className={`${s.card} ${s.content}`}>
        <ReceiptText size={28} strokeWidth={1.5} />
        <p className={s.muted}>Your payments, blocked pages and freezes will appear here once your vault is set up.</p>
      </div>
    );
  }

  return (
    <div className={s.content}>
      <div>
        <h1 className={s.h1}>Activity</h1>
        <p className={s.lead}>Every payment, blocked page and freeze. Tap one for its receipt.</p>
      </div>
      <div className={s.row}>
        <span className={s.liveDot} style={{ color: feed.live ? "var(--paid)" : "var(--text-muted)" }}>
          {feed.live ? "Live" : "Connecting…"}
        </span>
        <span className={`${s.muted} ${s.small}`}>{feed.rows.length ? `${feed.rows.length} recent` : ""}</span>
      </div>
      {feed.error ? <p className={s.danger}>{feed.error}</p> : null}
      {feed.rows.length === 0 && !feed.error ? (
        <div className={s.card}>
          <p className={s.muted}>No activity yet. Hold to speak on the Speak tab to make your first payment.</p>
        </div>
      ) : null}
      {feed.rows.length ? (
      <div className={`${s.card} ${s.list}`} style={{ gap: 0, padding: 8 }}>
        {feed.rows.map((r) => {
          const d = describeRun(r);
          return (
            <button className={s.listItem} key={r.id} onClick={() => setOpen(receiptFromRow(r))} type="button">
              <ToneIcon tone={d.tone} />
              <span style={{ minWidth: 0 }}>
                <span className={s.listTitle} style={{ display: "block" }}>
                  {d.title}
                </span>
                <span className={s.listSub}>
                  {d.detail} · {timeLabel(r.created_at)}
                </span>
              </span>
              <span className={s.listAmount} style={{ color: d.tone === "paid" ? "var(--text)" : "var(--text-muted)" }}>
                {r.amount_lamports !== null ? (d.tone === "paid" ? `−${formatSol(r.amount_lamports)}` : formatSol(r.amount_lamports)) : ""}
              </span>
            </button>
          );
        })}
      </div>
      ) : null}
      <p className={`${s.muted} ${s.small}`}>Voice transcripts are stored publicly for this Devnet demo.</p>
      {open ? <ReceiptSheet onClose={() => setOpen(null)} receipt={open} /> : null}
    </div>
  );
}
