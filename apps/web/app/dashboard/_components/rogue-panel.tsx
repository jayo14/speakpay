"use client";

import { DEMO_POLICY, explorerTxUrl, lamportsToSol, type SimulateRogueResponse } from "@speakpay/shared";
import { useState } from "react";

import { apiPost, errorText } from "@/lib/client/api";

import s from "../dashboard.module.css";
import { StatusChip, short } from "./status-chip";
import { playTts } from "./play-tts";

// T1 — Layer 2 proof: the delegate key signs directly, bypassing voice, LLM and prechecks.
export function RoguePanel({ vaultPda, onRun }: { vaultPda: string; onRun: () => void }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [res, setRes] = useState<SimulateRogueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fire = async (amount: number) => {
    setBusy(amount);
    setError(null);
    try {
      const r = await apiPost<SimulateRogueResponse>("/api/simulate-rogue", { vault_pda: vaultPda, amount_lamports: amount, client: "web" });
      setRes(r);
      playTts(r.tts_audio_base64);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
      onRun();
    }
  };

  return (
    <div className={s.card}>
      <span className={s.label}>Security test · simulate a compromised agent</span>
      {[DEMO_POLICY.roguePayLamports, DEMO_POLICY.rogueCompliantLamports].map((amt, i) => (
        <button
          className={i === 0 ? s.btnDanger : s.btnSecondary}
          disabled={busy !== null}
          key={amt}
          onClick={() => void fire(amt)}
          type="button"
        >
          {busy === amt ? "Submitting to Solana…" : `Simulate rogue agent: pay ${lamportsToSol(amt)} SOL`}
        </button>
      ))}
      {error ? <span className={s.danger}>{error}</span> : null}
      {res ? (
        <>
          <StatusChip status={res.status} />
          <p>{res.speech_text}</p>
          {res.error_code ? (
            <span className={s.mono}>
              {res.error_code}
              {res.error_number ? ` (${res.error_number}, 0x${res.error_number.toString(16)})` : ""}
            </span>
          ) : null}
          {res.tx_signature ? (
            <a className={s.ok} href={explorerTxUrl(res.tx_signature)} rel="noreferrer" target="_blank">
              Tx {short(res.tx_signature, 8)} ↗
            </a>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
