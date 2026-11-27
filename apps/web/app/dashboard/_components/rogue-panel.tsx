"use client";

import { DEMO_POLICY, explorerTxUrl, lamportsToSol, type SimulateRogueResponse } from "@speakpay/shared";
import { useState } from "react";

import { apiPost, errorText } from "@/lib/client/api";

import s from "../dashboard.module.css";
import { describeRun } from "@/lib/client/describe-run";

import { ToneIcon, short } from "./status-chip";
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

  const d = res ? describeRun({ ...res, kind: "rogue", amount_lamports: null, scraped_json: null }) : null;

  return (
    <div className={s.stack} style={{ gap: 10 }}>
      <div>
        <h2 className={s.h2}>Simulate a hacked agent</h2>
        <p className={s.muted}>
          Sends a payment straight from the agent key — skipping voice, AI and every app check — so you can see Solana itself refuse it.
        </p>
      </div>
      {[DEMO_POLICY.roguePayLamports, DEMO_POLICY.rogueCompliantLamports].map((amt, i) => (
        <button
          className={i === 0 ? s.btnDanger : s.btnSecondary}
          disabled={busy !== null}
          key={amt}
          onClick={() => void fire(amt)}
          type="button"
        >
          {busy === amt ? "Sending to Solana…" : `Hacked agent pays ${lamportsToSol(amt)} SOL`}
        </button>
      ))}
      {error ? <span className={s.danger}>{error}</span> : null}
      {res && d ? (
        <div className={s.row} style={{ flexWrap: "nowrap", justifyContent: "flex-start" }}>
          <ToneIcon tone={d.tone} />
          <div style={{ minWidth: 0 }}>
            <div className={s.listTitle}>{d.title}</div>
            <div className={s.listSub}>
              {d.detail}
              {res.error_number ? ` · code ${res.error_number} (0x${res.error_number.toString(16)})` : ""}
            </div>
            {res.tx_signature ? (
              <a className={s.linkBtn} href={explorerTxUrl(res.tx_signature)} rel="noreferrer" target="_blank">
                See it on Solana Explorer · {short(res.tx_signature, 6)}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
