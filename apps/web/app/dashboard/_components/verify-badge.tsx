"use client";

import type { AuditVerifyResponse } from "@speakpay/shared";
import { useState } from "react";

import { apiGet, errorText } from "@/lib/client/api";

import s from "../dashboard.module.css";

// T3: recompute the receipt hash server-side and compare it with the on-chain ExecutionAudited event.
export function VerifyBadge({ runId }: { runId: string }) {
  const [res, setRes] = useState<AuditVerifyResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!runId) return null;
  if (res) {
    return (
      <span style={{ color: res.match ? "var(--pass)" : "var(--block)", fontWeight: 700 }} title={`on-chain ${res.onchain_hash}`}>
        {res.match ? "✓ Evidence hash matches Solana" : "✗ Hash mismatch"} ({res.source})
      </span>
    );
  }
  return (
    <span>
      <button
        className={s.btnSecondary}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            setRes(await apiGet<AuditVerifyResponse>(`/api/audit/verify/${runId}`));
          } catch (e) {
            setError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
        style={{ minHeight: 32 }}
        type="button"
      >
        {busy ? "Verifying…" : "Verify evidence on-chain"}
      </button>
      {error ? <span className={s.danger}> {error}</span> : null}
    </span>
  );
}
