"use client";

import { PublicKey } from "@solana/web3.js";
import { DEMO_POLICY, explorerAddressUrl, explorerTxUrl, lamportsToSol, solToLamports, type VaultReadResponse } from "@speakpay/shared";
import { ArrowDownToLine, ArrowUpFromLine, ChevronDown, ExternalLink, FlaskConical, Lock, Snowflake } from "lucide-react";
import { useEffect, useState } from "react";

import { formatSol } from "@/lib/client/describe-run";

import s from "../dashboard.module.css";
import { ReadinessCard } from "./readiness-card";
import { RoguePanel } from "./rogue-panel";
import { SetupDots } from "./setup-dots";
import { TonePill, short } from "./status-chip";
import { useOwnerAction } from "./use-vault";

type OwnerAction = ReturnType<typeof useOwnerAction>;

interface Rules {
  maxPerTxLamports: number;
  dailyCapLamports: number;
  cooldownSecs: number;
}

// Plain-language presets instead of raw numbers. "Balanced" is the demo policy (PRD §2).
const PRESETS: { id: string; name: string; rules: Rules }[] = [
  { id: "careful", name: "Careful", rules: { maxPerTxLamports: 20_000_000, dailyCapLamports: 50_000_000, cooldownSecs: 60 } },
  {
    id: "balanced",
    name: "Balanced",
    rules: { maxPerTxLamports: DEMO_POLICY.maxPerTxLamports, dailyCapLamports: DEMO_POLICY.dailyCapLamports, cooldownSecs: DEMO_POLICY.cooldownSecs },
  },
  { id: "flexible", name: "Flexible", rules: { maxPerTxLamports: 100_000_000, dailyCapLamports: 500_000_000, cooldownSecs: 10 } },
];

const FUND_CHOICES = [100_000_000, 200_000_000, 500_000_000];

function sentence(r: Rules) {
  return `Up to ${formatSol(r.maxPerTxLamports)} per payment, ${formatSol(r.dailyCapLamports)} a day`;
}

function sameRules(a: Rules, b: Rules) {
  return a.maxPerTxLamports === b.maxPerTxLamports && a.dailyCapLamports === b.dailyCapLamports && a.cooldownSecs === b.cooldownSecs;
}

function isPubkey(v: string) {
  try {
    return new PublicKey(v).toBase58() === v;
  } catch {
    return false;
  }
}

/** Preset cards + "Customise" fields + trusted wallet. Shared by setup and Edit rules. */
function RulesEditor({
  initial,
  initialTrusted,
  submitLabel,
  busy,
  onSubmit,
}: {
  initial: Rules;
  initialTrusted: string;
  submitLabel: string;
  busy: boolean;
  onSubmit: (rules: Rules, trusted: string[]) => void;
}) {
  const [maxSol, setMaxSol] = useState(String(lamportsToSol(initial.maxPerTxLamports)));
  const [daySol, setDaySol] = useState(String(lamportsToSol(initial.dailyCapLamports)));
  const [wait, setWait] = useState(String(initial.cooldownSecs));
  const [trusted, setTrusted] = useState(initialTrusted);

  const max = Number(maxSol);
  const day = Number(daySol);
  const cd = Number(wait);
  const numbersOk = Number.isFinite(max) && max > 0 && Number.isFinite(day) && day >= max && Number.isInteger(cd) && cd >= 0;
  const trustedOk = trusted.trim() === "" || isPubkey(trusted.trim());
  const rules: Rules | null = numbersOk ? { maxPerTxLamports: solToLamports(max), dailyCapLamports: solToLamports(day), cooldownSecs: cd } : null;
  const pick = (r: Rules) => {
    setMaxSol(String(lamportsToSol(r.maxPerTxLamports)));
    setDaySol(String(lamportsToSol(r.dailyCapLamports)));
    setWait(String(r.cooldownSecs));
  };

  return (
    <div className={s.stack} style={{ gap: 14 }}>
      <div className={s.grid3}>
        {PRESETS.map((p) => (
          <button
            aria-pressed={!!rules && sameRules(rules, p.rules)}
            className={`${s.preset} ${rules && sameRules(rules, p.rules) ? s.presetActive : ""}`}
            key={p.id}
            onClick={() => pick(p.rules)}
            type="button"
          >
            <span className={s.presetName}>{p.name}</span>
            <span className={`${s.muted} ${s.small}`}>{sentence(p.rules)}</span>
          </button>
        ))}
      </div>

      <details className={s.details}>
        <summary>
          Customise <ChevronDown size={16} strokeWidth={1.75} />
        </summary>
        <div className={s.grid3} style={{ marginTop: 12 }}>
          <label className={s.stack} style={{ gap: 6 }}>
            <span className={s.label}>Most per payment (SOL)</span>
            <input className={s.input} inputMode="decimal" onChange={(e) => setMaxSol(e.target.value)} value={maxSol} />
          </label>
          <label className={s.stack} style={{ gap: 6 }}>
            <span className={s.label}>Most per day (SOL)</span>
            <input className={s.input} inputMode="decimal" onChange={(e) => setDaySol(e.target.value)} value={daySol} />
          </label>
          <label className={s.stack} style={{ gap: 6 }}>
            <span className={s.label}>Wait between payments (s)</span>
            <input className={s.input} inputMode="numeric" onChange={(e) => setWait(e.target.value)} value={wait} />
          </label>
        </div>
        <p className={`${s.muted} ${s.small}`} style={{ marginTop: 8 }}>
          The wait stops a hacked agent from firing many payments in a row, giving you time to freeze.
        </p>
      </details>

      <label className={s.stack} style={{ gap: 6 }}>
        <span className={s.label}>Who can it pay? (optional)</span>
        <input
          className={`${s.input} ${s.inputMono} ${trustedOk ? "" : s.inputError}`}
          onChange={(e) => setTrusted(e.target.value)}
          placeholder="Paste a trusted wallet address — empty means anyone"
          value={trusted}
        />
      </label>

      {!numbersOk ? <p className={s.danger}>Per-payment must be above 0 and no more than the daily limit; the wait can&apos;t be negative.</p> : null}
      {!trustedOk ? <p className={s.danger}>That isn&apos;t a valid Solana wallet address.</p> : null}

      <button
        className={s.btn}
        disabled={busy || !rules || !trustedOk}
        onClick={() => rules && onSubmit(rules, trusted.trim() ? [trusted.trim()] : [])}
        type="button"
      >
        {busy ? "Approve in your wallet…" : submitLabel}
      </button>
    </div>
  );
}

function FundPicker({ action, label }: { action: OwnerAction; label: string }) {
  const [amount, setAmount] = useState<number>(DEMO_POLICY.depositLamports);
  return (
    <div className={s.stack} style={{ gap: 12 }}>
      <div className={s.chipRow}>
        {FUND_CHOICES.map((a) => (
          <button className={`${s.choice} ${a === amount ? s.choiceActive : ""}`} key={a} onClick={() => setAmount(a)} type="button">
            {formatSol(a)}
          </button>
        ))}
      </div>
      <button
        className={s.btn}
        disabled={action.busy}
        onClick={() => void action.run({ action: "deposit", params: { amount_lamports: amount } })}
        type="button"
      >
        <ArrowDownToLine size={18} strokeWidth={1.75} />
        {action.busy ? "Approve in your wallet…" : `${label} ${formatSol(amount)}`}
      </button>
    </div>
  );
}

function ActionResult({ action }: { action: OwnerAction }) {
  return (
    <>
      {action.error ? <p className={s.danger}>{action.error}</p> : null}
      {action.signature ? (
        <a className={s.linkBtn} href={explorerTxUrl(action.signature)} rel="noreferrer" target="_blank">
          Confirmed on Solana · {short(action.signature, 6)} <ExternalLink size={14} strokeWidth={1.75} />
        </a>
      ) : null}
    </>
  );
}

function useNowSecs() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// Vault: setup (rules → funds) for new users, then balance, rules, freeze, funds and the Security test.
export function VaultView({ data, demoAllowlist, onChanged }: { data: VaultReadResponse; demoAllowlist: string; onChanged: () => void }) {
  const action = useOwnerAction(onChanged);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const now = useNowSecs();
  const v = data.vault;

  if (!v) {
    return (
      <div className={s.content}>
        <SetupDots step={2} />
        <div>
          <h1 className={s.h1}>Set your spending rules</h1>
          <p className={s.lead}>Solana enforces these limits — not the AI. You can change them any time.</p>
        </div>
        <div className={s.card}>
          <RulesEditor
            busy={action.busy}
            initial={PRESETS[1]!.rules}
            initialTrusted={demoAllowlist}
            onSubmit={(r, allowlist) =>
              void action.run({
                action: "init",
                params: { max_per_tx_lamports: r.maxPerTxLamports, daily_cap_lamports: r.dailyCapLamports, cooldown_secs: r.cooldownSecs, allowlist },
              })
            }
            submitLabel="Create my vault"
          />
          <ActionResult action={action} />
        </div>
      </div>
    );
  }

  if (data.vault_funds_lamports === 0 && v.tx_count === 0) {
    return (
      <div className={s.content}>
        <SetupDots step={3} />
        <div>
          <h1 className={s.h1}>Add funds</h1>
          <p className={s.lead}>Move Devnet SOL from your wallet into your vault. Your agent can only spend what&apos;s here.</p>
        </div>
        <div className={s.card}>
          <FundPicker action={action} label="Add" />
          <ActionResult action={action} />
        </div>
      </div>
    );
  }

  const current: Rules = { maxPerTxLamports: v.max_per_tx_lamports, dailyCapLamports: v.daily_cap_lamports, cooldownSecs: v.cooldown_secs };
  const spent = now - v.window_start_ts < 86_400 ? v.daily_spent_lamports : 0;

  return (
    <div className={s.content}>
      <div className={s.row}>
        <h1 className={s.h1}>Vault</h1>
        {v.is_frozen ? (
          <TonePill tone="frozen">
            <Snowflake size={14} strokeWidth={2} /> Frozen
          </TonePill>
        ) : (
          <TonePill tone="paid">Active</TonePill>
        )}
      </div>

      <div className={`${s.card} ${v.is_frozen ? s.cardFrozen : ""}`}>
        <span className={s.label}>Vault balance</span>
        <span className={s.bigNum}>{formatSol(data.vault_funds_lamports)}</span>
        <span className={`${s.muted} ${s.num}`}>
          Spent today {formatSol(spent)} of {formatSol(v.daily_cap_lamports)} · {v.tx_count} payment{v.tx_count === 1 ? "" : "s"}
        </span>
      </div>

      <div className={`${s.card} ${v.is_frozen ? s.cardFrozen : ""}`}>
        <div className={s.row}>
          <div>
            <h2 className={s.h2}>{v.is_frozen ? "Your vault is frozen" : "Freeze vault"}</h2>
            <p className={s.muted}>{v.is_frozen ? "Your agent can't spend until you unfreeze." : "Instantly stop your agent from spending. Say “Freeze my vault” too."}</p>
          </div>
          <button
            className={v.is_frozen ? s.btnSecondary : s.btnFrozen}
            disabled={action.busy}
            onClick={() => void action.run({ action: "toggle_freeze", params: { frozen: !v.is_frozen } })}
            type="button"
          >
            {v.is_frozen ? <Lock size={18} strokeWidth={1.75} /> : <Snowflake size={18} strokeWidth={1.75} />}
            {action.busy ? "Approve in wallet…" : v.is_frozen ? "Unfreeze" : "Freeze"}
          </button>
        </div>
      </div>

      <div className={s.card}>
        <h2 className={s.h2}>Your rules</h2>
        <p>{sentence(current)}</p>
        <p className={s.muted}>
          Wait {v.cooldown_secs}s between payments ·{" "}
          {v.allowlist.length ? `pays only ${v.allowlist.length === 1 ? "1 trusted wallet" : `${v.allowlist.length} trusted wallets`}` : "can pay anyone"}
        </p>
        <details className={s.details}>
          <summary>
            Edit rules <ChevronDown size={16} strokeWidth={1.75} />
          </summary>
          <div style={{ marginTop: 12 }}>
            <RulesEditor
              busy={action.busy}
              initial={current}
              initialTrusted={v.allowlist[0] ?? ""}
              key={`${v.max_per_tx_lamports}:${v.daily_cap_lamports}:${v.cooldown_secs}:${v.allowlist.join(",")}`}
              onSubmit={(r, allowlist) =>
                void action.run({
                  action: "update_policy",
                  params: {
                    max_per_tx_lamports: r.maxPerTxLamports,
                    daily_cap_lamports: r.dailyCapLamports,
                    cooldown_secs: r.cooldownSecs,
                    allowlist,
                    agent_delegate: v.agent_delegate,
                  },
                })
              }
              submitLabel="Save rules"
            />
          </div>
        </details>
      </div>

      <div className={s.card}>
        <h2 className={s.h2}>Add funds</h2>
        <FundPicker action={action} label="Add" />
      </div>

      <div className={s.card}>
        <h2 className={s.h2}>Withdraw</h2>
        <p className={s.muted}>Move everything in the vault back to your wallet. Works even while frozen.</p>
        <button
          className={s.btnDanger}
          disabled={action.busy || data.vault_funds_lamports === 0}
          onClick={() => {
            if (!confirmWithdraw) return setConfirmWithdraw(true);
            setConfirmWithdraw(false);
            void action.run({ action: "withdraw_all" });
          }}
          type="button"
        >
          <ArrowUpFromLine size={18} strokeWidth={1.75} />
          {confirmWithdraw ? `Tap again to withdraw ${formatSol(data.vault_funds_lamports)}` : "Withdraw all"}
        </button>
      </div>

      <ActionResult action={action} />

      <details className={`${s.card} ${s.details}`}>
        <summary>
          <FlaskConical size={18} strokeWidth={1.75} /> Security test &amp; demo checks <ChevronDown size={16} strokeWidth={1.75} />
        </summary>
        <div className={s.stack} style={{ gap: 16, marginTop: 12 }}>
          <ReadinessCard data={data} />
          <RoguePanel onRun={onChanged} vaultPda={v.vault_pda} />
          <dl className={s.kv}>
            <dt>Vault</dt>
            <dd>
              <a href={explorerAddressUrl(v.vault_pda)} rel="noreferrer" target="_blank">
                {short(v.vault_pda, 6)}
              </a>
            </dd>
            <dt>Funds</dt>
            <dd>
              <a href={explorerAddressUrl(v.vault_funds_pda)} rel="noreferrer" target="_blank">
                {short(v.vault_funds_pda, 6)}
              </a>
            </dd>
            <dt>Agent key</dt>
            <dd>
              <a href={explorerAddressUrl(v.agent_delegate)} rel="noreferrer" target="_blank">
                {short(v.agent_delegate, 6)}
              </a>
            </dd>
          </dl>
        </div>
      </details>
    </div>
  );
}
