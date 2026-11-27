"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { demoReadiness, type VaultReadResponse } from "@speakpay/shared";
import { useEffect, useState } from "react";

import { CircleCheck, CircleX } from "lucide-react";

import s from "../dashboard.module.css";
import { TonePill } from "./status-chip";

// Pre-demo reset checklist (PRD §2), live from chain. All green = ready to record a take.
export function ReadinessCard({ data }: { data: VaultReadResponse }) {
  const { connection } = useConnection();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [delegate, setDelegate] = useState<{ key: string; lamports: number } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const key = data.delegate_pubkey;
    const load = () =>
      connection.getBalance(new PublicKey(key)).then(
        (lamports) => !cancelled && setDelegate({ key, lamports }),
        () => undefined,
      );
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [connection, data.delegate_pubkey]);

  if (!data.vault) return null;
  const delegateLamports = delegate?.key === data.delegate_pubkey ? delegate.lamports : null;
  const checks = demoReadiness(data.vault, data.vault_funds_lamports, delegateLamports, now);
  const ready = checks.every((c) => c.ok);

  return (
    <div className={s.stack}>
      <TonePill tone={ready ? "paid" : "blocked"}>{ready ? "Demo ready" : "Not demo ready yet"}</TonePill>
      {checks.map((c) => (
        <div className={s.row} key={c.id}>
          <span style={{ alignItems: "center", color: c.ok ? "var(--paid)" : "var(--blocked)", display: "inline-flex", gap: 8 }}>
            {c.ok ? <CircleCheck size={16} strokeWidth={2} /> : <CircleX size={16} strokeWidth={2} />}
            <span style={{ color: "var(--text)" }}>{c.label}</span>
          </span>
          <span className={`${s.muted} ${s.small}`}>{c.detail}</span>
        </div>
      ))}
    </div>
  );
}
