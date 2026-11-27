"use client";

import { PublicKey } from "@solana/web3.js";
import { DEMO_POLICY, explorerAddressUrl, explorerTxUrl, lamportsToSol, type VaultReadResponse } from "@speakpay/shared";
import { useEffect, useState } from "react";

import s from "../dashboard.module.css";
import { short } from "./status-chip";
import { useOwnerAction } from "./use-vault";

function isPubkey(v: string) {
  try {
    return new PublicKey(v).toBase58() === v;
  } catch {
    return false;
  }
}

function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// Vault card + owner actions (PRD §8.3 left column). All values are a live chain read.
export function VaultPanel({ data, onChanged }: { data: VaultReadResponse | null; onChanged: () => void }) {
  const action = useOwnerAction(onChanged);
  const [allow, setAllow] = useState("");
  const now = useNow();

  if (!data) return null;
  const v = data.vault;

  if (!v) {
    const allowOk = allow === "" || isPubkey(allow.trim());
    return (
      <div className={s.card}>
        <span className={s.label}>Create your vault</span>
        <p>
          Max {lamportsToSol(DEMO_POLICY.maxPerTxLamports)} SOL per payment · {lamportsToSol(DEMO_POLICY.dailyCapLamports)} SOL
          per day · {DEMO_POLICY.cooldownSecs}s cooldown
        </p>
        <label className={s.label} htmlFor="allow">
          Allowlisted merchant wallet (optional)
        </label>
        <input
          className={s.input}
          id="allow"
          onChange={(e) => setAllow(e.target.value)}
          placeholder="Empty = any recipient"
          style={allowOk ? undefined : { borderColor: "var(--block)" }}
          value={allow}
        />
        <button
          className={s.btn}
          disabled={action.busy || !allowOk}
          onClick={() =>
            void action.run({
              action: "init",
              params: {
                max_per_tx_lamports: DEMO_POLICY.maxPerTxLamports,
                daily_cap_lamports: DEMO_POLICY.dailyCapLamports,
                cooldown_secs: DEMO_POLICY.cooldownSecs,
                allowlist: allow.trim() ? [allow.trim()] : [],
              },
            })
          }
          type="button"
        >
          {action.busy ? "Waiting for wallet…" : "Create vault"}
        </button>
        {action.error ? <p className={s.danger}>{action.error}</p> : null}
      </div>
    );
  }

  const windowOpen = now - v.window_start_ts < 86_400;
  const spent = windowOpen ? v.daily_spent_lamports : 0;
  const cooldownLeft = v.last_tx_ts === 0 ? 0 : Math.max(0, v.last_tx_ts + v.cooldown_secs - now);

  return (
    <>
      <div className={s.card}>
        <div className={s.row}>
          <span className={s.label}>Vault balance</span>
          {v.is_frozen ? <span className={s.chip} style={{ color: "var(--frozen)" }}>FROZEN</span> : null}
        </div>
        <span className={s.big}>{lamportsToSol(data.vault_funds_lamports)} SOL</span>
        <span className={s.label}>Spent today</span>
        <span className={s.mono}>
          {lamportsToSol(spent)} / {lamportsToSol(v.daily_cap_lamports)} SOL
        </span>
        <div className={s.bar}>
          <div className={s.fill} style={{ width: `${Math.min(100, (spent / v.daily_cap_lamports) * 100)}%` }} />
        </div>
        <div className={s.row}>
          <span>Max/payment <span className={s.mono}>{lamportsToSol(v.max_per_tx_lamports)} SOL</span></span>
          <span>Cooldown <span className={s.mono}>{cooldownLeft > 0 ? `${cooldownLeft}s` : "ready"}</span></span>
          <span>Payments <span className={s.mono}>{v.tx_count}</span></span>
        </div>
        <span className={s.muted}>
          Allowlist: {v.allowlist.length ? v.allowlist.map((a) => short(a)).join(", ") : "open (any recipient)"}
        </span>
        <a className={s.mono} href={explorerAddressUrl(v.vault_pda)} rel="noreferrer" target="_blank">
          PDA {short(v.vault_pda, 8)} ↗
        </a>
      </div>
      <button
        className={s.btn}
        disabled={action.busy}
        onClick={() => void action.run({ action: "deposit", params: { amount_lamports: DEMO_POLICY.depositLamports } })}
        type="button"
      >
        Deposit {lamportsToSol(DEMO_POLICY.depositLamports)} SOL
      </button>
      <button
        className={s.btnSecondary}
        disabled={action.busy}
        onClick={() => void action.run({ action: "toggle_freeze", params: { frozen: !v.is_frozen } })}
        type="button"
      >
        {v.is_frozen ? "Unfreeze vault" : "Freeze vault"}
      </button>
      <button
        className={s.btnDanger}
        disabled={action.busy || data.vault_funds_lamports === 0}
        onClick={() => void action.run({ action: "withdraw_all" })}
        type="button"
      >
        Withdraw all
      </button>
      {action.error ? <p className={s.danger}>{action.error}</p> : null}
      {action.signature ? (
        <a className={s.ok} href={explorerTxUrl(action.signature)} rel="noreferrer" target="_blank">
          Confirmed {short(action.signature, 8)} ↗
        </a>
      ) : null}
    </>
  );
}
