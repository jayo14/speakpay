"use client";

import { explorerAddressUrl, explorerTxUrl } from "@speakpay/shared";
import { ChevronDown, ExternalLink, X } from "lucide-react";
import { useEffect } from "react";

import { describeRun, formatSol, merchantName } from "@/lib/client/describe-run";

import s from "../dashboard.module.css";
import type { Receipt } from "./receipt";
import { ToneIcon, short } from "./status-chip";
import { VerifyBadge } from "./verify-badge";

// A permanent receipt for every run. Payments can't be reversed on Solana — this is the proof of what
// was said, what the page showed and what moved, to keep or show a merchant.
export function ReceiptSheet({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const d = describeRun(receipt);
  const scraped = receipt.scraped_json as { plan_name?: unknown; price_sol?: unknown } | null;
  const merchant = merchantName(receipt.scraped_json);
  const plan = typeof scraped?.plan_name === "string" ? scraped.plan_name : null;
  const price = typeof scraped?.price_sol === "number" ? `${scraped.price_sol} SOL` : null;
  const when = new Date(receipt.created_at);

  return (
    <>
      <div aria-hidden className={s.overlay} onClick={onClose} />
      <section aria-label="Receipt" aria-modal="true" className={s.sheet} role="dialog">
        <div className={s.grabber} />
        <div className={s.row}>
          <span className={s.label}>Receipt</span>
          <button aria-label="Close receipt" className={s.iconBtn} onClick={onClose} type="button">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className={s.stack} style={{ alignItems: "center", padding: "12px 0 20px", textAlign: "center" }}>
          <ToneIcon size={56} tone={d.tone} />
          <h2 className={s.h2}>{d.title}</h2>
          <p className={s.muted}>{d.detail}</p>
          {receipt.amount_lamports !== null ? <span className={s.bigNum}>{formatSol(receipt.amount_lamports)}</span> : null}
          {receipt.status === "PASSED" && receipt.kind === "voice" && receipt.id ? <VerifyBadge runId={receipt.id} /> : null}
        </div>

        <dl className={s.kv}>
          {receipt.transcript ? (
            <>
              <dt>You said</dt>
              <dd>“{receipt.transcript}”</dd>
            </>
          ) : null}
          {merchant ? (
            <>
              <dt>Page showed</dt>
              <dd>{[merchant, plan, price].filter(Boolean).join(" · ")}</dd>
            </>
          ) : null}
          {receipt.recipient_pubkey ? (
            <>
              <dt>Paid to</dt>
              <dd>
                <a href={explorerAddressUrl(receipt.recipient_pubkey)} rel="noreferrer" target="_blank">
                  {short(receipt.recipient_pubkey, 6)}
                </a>
              </dd>
            </>
          ) : null}
          <dt>When</dt>
          <dd>{when.toLocaleString()}</dd>
          <dt>Network</dt>
          <dd>Solana Devnet</dd>
        </dl>

        {receipt.tx_signature ? (
          <a className={`${s.btnSecondary}`} href={explorerTxUrl(receipt.tx_signature)} rel="noreferrer" style={{ marginTop: 20, textDecoration: "none" }} target="_blank">
            View on Solana Explorer <ExternalLink size={16} strokeWidth={1.75} />
          </a>
        ) : null}

        <details className={s.details} style={{ marginTop: 20 }}>
          <summary>
            Technical details <ChevronDown size={16} strokeWidth={1.75} />
          </summary>
          <dl className={s.kv} style={{ marginTop: 12 }}>
            <dt>Status</dt>
            <dd className={s.mono}>{receipt.status}</dd>
            {receipt.error_code ? (
              <>
                <dt>Code</dt>
                <dd className={s.mono}>
                  {receipt.error_code}
                  {receipt.error_number ? ` (${receipt.error_number}, 0x${receipt.error_number.toString(16)})` : ""}
                </dd>
              </>
            ) : null}
            {receipt.evidence_hash ? (
              <>
                <dt>Evidence</dt>
                <dd className={s.mono}>{receipt.evidence_hash}</dd>
              </>
            ) : null}
            {receipt.tx_signature ? (
              <>
                <dt>Signature</dt>
                <dd className={s.mono}>{receipt.tx_signature}</dd>
              </>
            ) : null}
            {receipt.timings ? (
              <>
                <dt>Timing</dt>
                <dd className={s.mono}>
                  voice {receipt.timings.stt}ms · page {receipt.timings.scrape ?? "–"}ms · chain {receipt.timings.chain ?? "–"}ms · total{" "}
                  {receipt.timings.total}ms
                </dd>
              </>
            ) : null}
            {receipt.id ? (
              <>
                <dt>Run</dt>
                <dd className={s.mono}>{receipt.id}</dd>
              </>
            ) : null}
            <dt>Source</dt>
            <dd className={s.mono}>
              {receipt.kind}
              {receipt.client ? ` · ${receipt.client}` : ""}
            </dd>
          </dl>
        </details>
      </section>
    </>
  );
}
