"use client";

import { lamportsToSol, type AuditFreezeResponse, type VaultReadResponse, type VoiceCommandResponse } from "@speakpay/shared";
import { Check, Mic, Shield, ShieldX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiPost, apiPostForm, errorText } from "@/lib/client/api";
import { describeRun, formatSol, type Tone } from "@/lib/client/describe-run";

import s from "../dashboard.module.css";
import { IceCube } from "./ice-cube";
import { playTts } from "./play-tts";
import { receiptFromVoice, type Receipt } from "./receipt";
import { ReceiptSheet } from "./receipt-sheet";
import { TonePill, ToneIcon } from "./status-chip";
import { useOwnerAction } from "./use-vault";

const MIN_MS = 700;
const MAX_MS = 15_000;
const RESULT_FLASH_MS = 2600;

type OrbState = "idle" | "listening" | "working" | Exclude<Tone, "neutral">;

const TRY = [
  "“Check the Dev3pack merchant page — if the Starter Plan is under 0.05 SOL, pay them.”",
  "“Check the Shady Deals merchant page and pay for the discount plan.”",
  "“Freeze my vault.”",
];

function pickMime(): string {
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function StatusStrip({ data }: { data: VaultReadResponse }) {
  const now = useNow();
  const v = data.vault!;
  const spent = now - v.window_start_ts < 86_400 ? v.daily_spent_lamports : 0;
  const cooldownLeft = v.last_tx_ts === 0 ? 0 : Math.max(0, v.last_tx_ts + v.cooldown_secs - now);
  const state: { tone: Tone; label: string } = v.is_frozen
    ? { tone: "frozen", label: "Frozen" }
    : data.vault_funds_lamports === 0
      ? { tone: "blocked", label: "No funds" }
      : cooldownLeft > 0
        ? { tone: "neutral", label: `Wait ${cooldownLeft}s` }
        : { tone: "paid", label: "Ready" };

  return (
    <div className={`${s.card} ${s.strip}`}>
      <div className={s.stripBal}>
        <span className={s.label}>Balance</span>
        <div className={s.num} style={{ fontSize: 22, fontWeight: 700 }}>
          {formatSol(data.vault_funds_lamports)}
        </div>
      </div>
      <div className={`${s.stack} ${s.stripSpent}`} style={{ gap: 6 }}>
        <div className={s.row} style={{ flexWrap: "nowrap" }}>
          <span className={s.label}>Spent today</span>
          <span className={`${s.label} ${s.num}`} style={{ whiteSpace: "nowrap" }}>
            {lamportsToSol(spent)} / {formatSol(v.daily_cap_lamports)}
          </span>
        </div>
        <div className={s.bar}>
          <div className={s.fill} style={{ width: `${Math.min(100, (spent / v.daily_cap_lamports) * 100)}%` }} />
        </div>
      </div>
      <span className={s.stripPill}>
        <TonePill tone={state.tone}>{state.label}</TonePill>
      </span>
    </div>
  );
}

function OrbIcon({ state }: { state: OrbState }) {
  const p = { size: 64, strokeWidth: 1.5 } as const;
  const icon =
    state === "working" ? (
      <Shield {...p} />
    ) : state === "paid" ? (
      <Check size={80} strokeWidth={3} />
    ) : state === "blocked" ? (
      <ShieldX size={72} strokeWidth={2.25} />
    ) : state === "frozen" ? (
      <IceCube size={84} strokeWidth={2.5} />
    ) : (
      <Mic {...p} />
    );
  // Keyed so each state change replays the morph-in animation.
  return (
    <span className={s.orbIcon} key={state}>
      {icon}
    </span>
  );
}

const CAPTION: Record<OrbState, [string, string]> = {
  idle: ["Hold to speak", "Hold the button (or Space), speak, then let go"],
  listening: ["Listening…", "Let go when you're done"],
  working: ["Checking…", "Transcribing, verifying the page and your limits"],
  paid: ["Paid", "Inside your limits · receipt saved"],
  blocked: ["Stopped", "Nothing was sent"],
  frozen: ["Frozen", "Your agent can no longer spend"],
};

// Speak (home). Same /api/voice-command as the Android app.
export function SpeakView({
  data,
  owner,
  username,
  onRun,
  onGoToVault,
}: {
  data: VaultReadResponse;
  owner: string;
  username: string;
  onRun: () => void;
  onGoToVault: () => void;
}) {
  const vault = data.vault!;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meter = useRef<{ ctx: AudioContext; raf: number } | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Exclude<Tone, "neutral"> | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [result, setResult] = useState<VoiceCommandResponse | null>(null);
  const [resultAt, setResultAt] = useState<string>("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [frozenNote, setFrozenNote] = useState<string | null>(null);
  const [freezeError, setFreezeError] = useState<string | null>(null);
  const freeze = useOwnerAction(onRun);

  const stopMeter = useCallback(() => {
    if (!meter.current) return;
    cancelAnimationFrame(meter.current.raf);
    void meter.current.ctx.close();
    meter.current = null;
    stageRef.current?.style.setProperty("--level", "0");
  }, []);

  useEffect(() => stopMeter, [stopMeter]);

  // T4: owner signs toggle_freeze(true) in the wallet, then the server verifies it on-chain and logs FROZEN.
  const approveFreeze = useCallback(
    async (parentRunId: string) => {
      setFreezeError(null);
      const sig = await freeze.run({ action: "toggle_freeze", params: { frozen: true } });
      if (!sig) return;
      try {
        const r = await apiPost<AuditFreezeResponse>("/api/audit/freeze", {
          vault_pda: vault.vault_pda,
          tx_signature: sig,
          client: "web",
          ...(parentRunId ? { parent_run_id: parentRunId } : {}),
        });
        setFrozenNote(r.speech_text);
        setFlash("frozen");
        playTts(r.tts_audio_base64);
      } catch (e) {
        setFreezeError(errorText(e));
      }
    },
    [freeze, vault.vault_pda],
  );

  const upload = useCallback(
    async (blob: Blob) => {
      setBusy(true);
      setHint(null);
      try {
        const form = new FormData();
        form.append("audio", blob, blob.type.includes("mp4") ? "command.m4a" : "command.webm");
        form.append("vault_pda", vault.vault_pda);
        form.append("owner_pubkey", owner);
        form.append("client", "web");
        const r = await apiPostForm<VoiceCommandResponse>("/api/voice-command", form);
        setResult(r);
        setResultAt(new Date().toISOString());
        setFrozenNote(null);
        const tone = describeRun({ ...r, kind: "voice" }).tone;
        setFlash(tone === "neutral" ? null : tone);
        setTimeout(() => setFlash(null), RESULT_FLASH_MS);
        playTts(r.tts_audio_base64);
        // Voice kill switch: open the wallet straight away (PRD §2).
        if (r.next_action === "sign_freeze") void approveFreeze(r.run_id);
      } catch (e) {
        setHint(errorText(e));
      } finally {
        setBusy(false);
        onRun();
      }
    },
    [vault.vault_pda, owner, onRun, approveFreeze],
  );

  const stop = useCallback(() => {
    if (maxTimer.current) clearTimeout(maxTimer.current);
    if (rec.current?.state === "recording") rec.current.stop();
  }, []);

  const start = useCallback(async () => {
    if (busy || recording) return;
    setHint(null);
    setFlash(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setHint("Allow microphone access to speak to pay.");
      return;
    }
    // Live voice level → CSS --level drives the waves (no re-renders).
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (const b of buf) sum += ((b - 128) / 128) ** 2;
        const level = Math.min(1, Math.sqrt(sum / buf.length) * 4);
        stageRef.current?.style.setProperty("--level", level.toFixed(3));
        if (meter.current) meter.current.raf = requestAnimationFrame(tick);
      };
      meter.current = { ctx, raf: requestAnimationFrame(tick) };
    } catch {
      // Waves are decorative; recording still works without the meter.
    }
    const mime = pickMime();
    const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      stopMeter();
      setRecording(false);
      if (Date.now() - startedAt.current < MIN_MS) {
        setHint("Hold a little longer while you speak.");
        return;
      }
      void upload(new Blob(chunks.current, { type: r.mimeType || "audio/webm" }));
    };
    rec.current = r;
    startedAt.current = Date.now();
    r.start();
    setRecording(true);
    maxTimer.current = setTimeout(stop, MAX_MS);
  }, [busy, recording, stop, upload, stopMeter]);

  const orb: OrbState = recording ? "listening" : busy ? "working" : (flash ?? (vault.is_frozen ? "frozen" : "idle"));
  const [title, sub] = CAPTION[orb];
  const d = result ? describeRun({ ...result, kind: "voice" }) : null;

  return (
    <div className={s.content}>
      <div>
        <h1 className={s.h1}>{username ? `Hi, @${username}` : "Speak to pay"}</h1>
        <p className={s.lead}>Say what you want to pay for. I check the page and your limits first.</p>
      </div>

      <StatusStrip data={data} />

      {data.vault_funds_lamports === 0 ? (
        <div className={s.card}>
          <p>Your vault is empty. Add funds before your first payment.</p>
          <button className={s.btn} onClick={onGoToVault} type="button">
            Add funds
          </button>
        </div>
      ) : null}

      <div className={s.orbWrap}>
        <div className={s.orbStage} ref={stageRef}>
          {orb === "idle" ? <span aria-hidden className={s.ring} /> : null}
          {orb === "listening" ? (
            <>
              <span aria-hidden className={`${s.wave} ${s.wave2}`} />
              <span aria-hidden className={s.wave} />
            </>
          ) : null}
          {orb === "working" ? <span aria-hidden className={s.spin} /> : null}
          <button
            aria-label={recording ? "Listening — release to send" : "Hold to speak"}
            className={`${s.orb} ${s[`orb_${orb}`] ?? ""}`}
            disabled={busy}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.code === "Space" && !e.repeat) {
                e.preventDefault();
                void start();
              }
            }}
            onKeyUp={(e) => e.code === "Space" && stop()}
            onPointerDown={() => void start()}
            onPointerLeave={stop}
            onPointerUp={stop}
            type="button"
          >
            <OrbIcon state={orb} />
          </button>
        </div>
        <div aria-live="polite" className={s.orbCaption}>
          <strong>{title}</strong>
          <span className={s.muted}>{sub}</span>
        </div>
        {hint ? <p className={s.danger} style={{ marginTop: 8 }}>{hint}</p> : null}
      </div>

      {result && d ? (
        <div className={s.card}>
          <div className={s.row} style={{ flexWrap: "nowrap", justifyContent: "flex-start" }}>
            <ToneIcon tone={d.tone} />
            <div style={{ minWidth: 0 }}>
              <div className={s.listTitle}>{d.title}</div>
              <div className={s.listSub}>{d.detail}</div>
            </div>
          </div>
          {result.transcript ? <p className={s.muted}>You said “{result.transcript}”</p> : null}
          {result.next_action === "sign_freeze" && !frozenNote ? (
            <button className={s.btnFrozen} disabled={freeze.busy} onClick={() => void approveFreeze(result.run_id)} type="button">
              <IceCube size={20} />
              {freeze.busy ? "Waiting for your wallet…" : "Approve freeze in wallet"}
            </button>
          ) : null}
          {frozenNote ? <TonePill tone="frozen">{frozenNote}</TonePill> : null}
          {freeze.error || freezeError ? <p className={s.danger}>{freeze.error ?? freezeError}</p> : null}
          <button className={s.btnSecondary} onClick={() => setReceipt(receiptFromVoice(result, resultAt))} type="button">
            View receipt
          </button>
        </div>
      ) : null}

      <div className={s.stack}>
        <span className={s.label}>Try saying</span>
        <div className={s.tryList}>
          {TRY.map((t) => (
            <div className={s.tryItem} key={t}>
              {t}
            </div>
          ))}
        </div>
        <p className={`${s.muted} ${s.small}`}>
          Limit: up to {formatSol(vault.max_per_tx_lamports)} per payment. Payments on Solana can&apos;t be reversed, so SpeakPay checks first.
        </p>
      </div>

      {receipt ? <ReceiptSheet onClose={() => setReceipt(null)} receipt={receipt} /> : null}
    </div>
  );
}
