"use client";

import { PublicKey } from "@solana/web3.js";
import { DEMO_POLICY, explorerAddressUrl, explorerTxUrl, lamportsToSol, solToLamports, type VaultReadResponse } from "@speakpay/shared";
import { useEffect, useState } from "react";

import s from "../dashboard.module.css";
import { ReadinessCard } from "./readiness-card";
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

function parsePolicyInputs(maxSolStr: string, dailySolStr: string, cooldownStr: string, allowStr: string) {
  const maxSol = Number(maxSolStr);
  const dailySol = Number(dailySolStr);
  const cooldown = Number(cooldownStr);
  const allowTrimmed = allowStr.trim();
  const allowOk = allowTrimmed === "" || isPubkey(allowTrimmed);
  const valid =
    Number.isFinite(maxSol) &&
    maxSol > 0 &&
    Number.isFinite(dailySol) &&
    dailySol >= maxSol &&
    Number.isInteger(cooldown) &&
    cooldown >= 0 &&
    allowOk;
  return {
    valid,
    allowOk,
    maxPerTxLamports: valid ? solToLamports(maxSol) : 0,
    dailyCapLamports: valid ? solToLamports(dailySol) : 0,
    cooldownSecs: valid ? cooldown : 0,
    allowlist: allowTrimmed ? [allowTrimmed] : [],
  };
}

function CreateVaultForm({
  action,
  demoAllowlist,
}: {
  action: ReturnType<typeof useOwnerAction>;
  demoAllowlist: string;
}) {
  const [maxPerTx, setMaxPerTx] = useState(String(lamportsToSol(DEMO_POLICY.maxPerTxLamports)));
  const [dailyCap, setDailyCap] = useState(String(lamportsToSol(DEMO_POLICY.dailyCapLamports)));
  const [cooldownSecs, setCooldownSecs] = useState(String(DEMO_POLICY.cooldownSecs));
  const [allow, setAllow] = useState(demoAllowlist);
  const parsed = parsePolicyInputs(maxPerTx, dailyCap, cooldownSecs, allow);

  return (
    <div className={s.card}>
      <span className={s.label}>Create your vault</span>
      <p className={s.muted}>Set hard spending limits enforced by Solana. Demo defaults are pre-filled.</p>
      <div className={s.fieldGrid}>
        <div>
          <label className={s.label} htmlFor="init-max">Max / tx (SOL)</label>
          <input className={s.input} id="init-max" inputMode="decimal" onChange={(e) => setMaxPerTx(e.target.value)} value={maxPerTx} />
        </div>
        <div>
          <label className={s.label} htmlFor="init-daily">Daily cap (SOL)</label>
          <input className={s.input} id="init-daily" inputMode="decimal" onChange={(e) => setDailyCap(e.target.value)} value={dailyCap} />
        </div>
        <div>
          <label className={s.label} htmlFor="init-cd">Cooldown (s)</label>
          <input className={s.input} id="init-cd" inputMode="numeric" onChange={(e) => setCooldownSecs(e.target.value)} value={cooldownSecs} />
        </div>
      </div>
      <label className={s.label} htmlFor="allow">
        Allowlisted merchant wallet (optional)
      </label>
      <input
        className={s.input}
        id="allow"
        onChange={(e) => setAllow(e.target.value)}
        placeholder="Empty = any recipient"
        style={parsed.allowOk ? undefined : { borderColor: "var(--block)" }}
        value={allow}
      />
      <button
        className={s.btn}
        disabled={action.busy || !parsed.valid}
        onClick={() =>
          void action.run({
            action: "init",
            params: {
              max_per_tx_lamports: parsed.maxPerTxLamports,
              daily_cap_lamports: parsed.dailyCapLamports,
              cooldown_secs: parsed.cooldownSecs,
              allowlist: parsed.allowlist,
            },
          })
        }
        type="button"
      >
        {action.busy ? "Waiting for wallet…" : "Create vault"}
      </button>
      {!parsed.valid ? <p className={s.danger}>Ensure 0 &lt; max/tx ≤ daily cap, cooldown ≥ 0, and allowlist is valid.</p> : null}
      {action.error ? <p className={s.danger}>{action.error}</p> : null}
    </div>
  );
}

function EditPolicyForm({
  vault,
  action,
}: {
  vault: NonNullable<VaultReadResponse["vault"]>;
  action: ReturnType<typeof useOwnerAction>;
}) {
  const [maxPerTx, setMaxPerTx] = useState(String(lamportsToSol(vault.max_per_tx_lamports)));
  const [dailyCap, setDailyCap] = useState(String(lamportsToSol(vault.daily_cap_lamports)));
  const [cooldownSecs, setCooldownSecs] = useState(String(vault.cooldown_secs));
  const [allow, setAllow] = useState(vault.allowlist[0] ?? "");
  const parsed = parsePolicyInputs(maxPerTx, dailyCap, cooldownSecs, allow);

  return (
    <details className={s.details}>
      <summary className={s.summary}>Edit policy</summary>
      <div className={s.fieldGrid}>
        <div>
          <label className={s.label} htmlFor="edit-max">Max / tx (SOL)</label>
          <input className={s.input} id="edit-max" inputMode="decimal" onChange={(e) => setMaxPerTx(e.target.value)} value={maxPerTx} />
        </div>
        <div>
          <label className={s.label} htmlFor="edit-daily">Daily cap (SOL)</label>
          <input className={s.input} id="edit-daily" inputMode="decimal" onChange={(e) => setDailyCap(e.target.value)} value={dailyCap} />
        </div>
        <div>
          <label className={s.label} htmlFor="edit-cd">Cooldown (s)</label>
          <input className={s.input} id="edit-cd" inputMode="numeric" onChange={(e) => setCooldownSecs(e.target.value)} value={cooldownSecs} />
        </div>
      </div>
      <label className={s.label} htmlFor="edit-allow">Allowlisted merchant wallet (optional)</label>
      <input
        className={s.input}
        id="edit-allow"
        onChange={(e) => setAllow(e.target.value)}
        placeholder="Empty = any recipient"
        style={parsed.allowOk ? undefined : { borderColor: "var(--block)" }}
        value={allow}
      />
      <button
        className={s.btnSecondary}
        disabled={action.busy || !parsed.valid}
        onClick={() =>
          void action.run({
            action: "update_policy",
            params: {
              max_per_tx_lamports: parsed.maxPerTxLamports,
              daily_cap_lamports: parsed.dailyCapLamports,
              cooldown_secs: parsed.cooldownSecs,
              allowlist: parsed.allowlist,
              agent_delegate: vault.agent_delegate,
            },
          })
        }
        type="button"
      >
        {action.busy ? "Waiting for wallet…" : "Save policy"}
      </button>
    </details>
  );
}

// Vault card + owner actions (PRD §8.3 left column). All values are a live chain read.
export function VaultPanel({
  data,
  onChanged,
  demoAllowlist,
}: {
  data: VaultReadResponse | null;
  onChanged: () => void;
  demoAllowlist: string;
}) {
  const action = useOwnerAction(onChanged);
  const now = useNow();

  if (!data) return null;
  const v = data.vault;

  if (!v) {
    return <CreateVaultForm action={action} demoAllowlist={demoAllowlist} />;
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
      <ReadinessCard data={data} />
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
      <EditPolicyForm
        action={action}
        key={`${v.vault_pda}:${v.max_per_tx_lamports}:${v.daily_cap_lamports}:${v.cooldown_secs}:${v.allowlist.join(",")}`}
        vault={v}
      />
      {action.error ? <p className={s.danger}>{action.error}</p> : null}
      {action.signature ? (
        <a className={s.ok} href={explorerTxUrl(action.signature)} rel="noreferrer" target="_blank">
          Confirmed {short(action.signature, 8)} ↗
        </a>
      ) : null}
    </>
  );
}
