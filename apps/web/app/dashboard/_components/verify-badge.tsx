"use client";

import type { AuditVerifyResponse } from "@speakpay/shared";
import { ShieldCheck, ShieldX } from "lucide-react";
import { useState } from "react";

import { apiGet, errorText } from "@/lib/client/api";

import s from "../dashboard.module.css";
import { TonePill } from "./status-chip";

// T3: the server recomputes the receipt hash and compares it with the on-chain ExecutionAudited event.
export function VerifyBadge({ runId }: { runId: string }) {
  const [res, setRes] = useState<AuditVerifyResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!runId) return null;
  if (res) {
    return (
      <TonePill tone={res.match ? "paid" : "blocked"}>
        {res.match ? <ShieldCheck size={15} strokeWidth={2} /> : <ShieldX size={15} strokeWidth={2} />}
        {res.match ? "Verified on Solana" : "Hash mismatch"}
      </TonePill>
    );
  }
  return (
    <span className={s.stack}>
      <button
        className={`${s.btnSecondary} ${s.btnSmall}`}
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
        type="button"
      >
        <ShieldCheck size={16} strokeWidth={1.75} />
        {busy ? "Checking Solana…" : "Verify on Solana"}
      </button>
      {error ? <span className={`${s.danger} ${s.small}`}>{error}</span> : null}
    </span>
  );
}
