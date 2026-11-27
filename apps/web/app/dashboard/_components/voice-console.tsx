"use client";

import { explorerTxUrl, lamportsToSol, type VoiceCommandResponse } from "@speakpay/shared";
import { useCallback, useRef, useState } from "react";

import { apiPostForm, errorText } from "@/lib/client/api";

import s from "../dashboard.module.css";
import { StatusChip, short } from "./status-chip";
import { useOwnerAction } from "./use-vault";

const MIN_MS = 700;
const MAX_MS = 15_000;

function pickMime(): string {
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

export function playTts(base64: string | null) {
  if (!base64) return;
  void new Audio(`data:audio/mpeg;base64,${base64}`).play().catch(() => undefined);
}

// Browser voice console (PRD §8.3 centre): hold to talk → same /api/voice-command as the APK.
export function VoiceConsole({ vaultPda, owner, onRun }: { vaultPda: string; owner: string; onRun: () => void }) {
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [result, setResult] = useState<VoiceCommandResponse | null>(null);
  const freeze = useOwnerAction(onRun);

  const upload = useCallback(
    async (blob: Blob) => {
      setBusy(true);
      setHint(null);
      try {
        const form = new FormData();
        form.append("audio", blob, blob.type.includes("mp4") ? "command.m4a" : "command.webm");
        form.append("vault_pda", vaultPda);
        form.append("owner_pubkey", owner);
        form.append("client", "web");
        const r = await apiPostForm<VoiceCommandResponse>("/api/voice-command", form);
        setResult(r);
        playTts(r.tts_audio_base64);
      } catch (e) {
        setHint(errorText(e));
      } finally {
        setBusy(false);
        onRun();
      }
    },
    [vaultPda, owner, onRun],
  );

  const stop = useCallback(() => {
    if (maxTimer.current) clearTimeout(maxTimer.current);
    if (rec.current?.state === "recording") rec.current.stop();
  }, []);

  const start = useCallback(async () => {
    if (busy || recording) return;
    setHint(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setHint("Microphone permission is required");
      return;
    }
    const mime = pickMime();
    const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      if (Date.now() - startedAt.current < MIN_MS) {
        setHint("Hold to speak");
        return;
      }
      void upload(new Blob(chunks.current, { type: r.mimeType || "audio/webm" }));
    };
    rec.current = r;
    startedAt.current = Date.now();
    r.start();
    setRecording(true);
    maxTimer.current = setTimeout(stop, MAX_MS);
  }, [busy, recording, stop, upload]);

  const scraped = result?.scraped_json as { vendor_name?: string; plan_name?: string; price_sol?: number } | null | undefined;

  return (
    <div className={s.col}>
      <button
        aria-label="Hold to talk"
        className={`${s.mic} ${recording ? s.micActive : ""}`}
        disabled={busy}
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
        {recording ? "Listening…" : busy ? "Working…" : "Hold to talk"}
      </button>
      <span className={s.muted}>Hold the button (or Space) and speak. Release to send.</span>
      {busy ? <span className={s.muted}>Transcribing → verifying page → checking policy → on-chain</span> : null}
      {hint ? <span className={s.danger}>{hint}</span> : null}

      {result ? (
        <div className={s.card}>
          <StatusChip status={result.status} />
          <p>{result.speech_text}</p>
          <span className={s.label}>You said</span>
          <p>“{result.transcript}”</p>
          {scraped?.vendor_name ? (
            <>
              <span className={s.label}>Live page</span>
              <p>
                {scraped.vendor_name} · {scraped.plan_name} · {scraped.price_sol} SOL
              </p>
            </>
          ) : null}
          {result.amount_lamports !== null ? (
            <span className={s.mono}>Amount {lamportsToSol(result.amount_lamports)} SOL</span>
          ) : null}
          {result.error_code ? (
            <span className={s.mono}>
              Code {result.error_code}
              {result.error_number ? ` (${result.error_number})` : ""}
            </span>
          ) : null}
          {result.evidence_hash ? <span className={s.mono}>Evidence {short(result.evidence_hash, 10)}</span> : null}
          {result.tx_signature ? (
            <a className={s.ok} href={explorerTxUrl(result.tx_signature)} rel="noreferrer" target="_blank">
              Tx {short(result.tx_signature, 8)} ↗
            </a>
          ) : null}
          <span className={s.muted}>
            STT {result.timings_ms.stt}ms · scrape {result.timings_ms.scrape ?? "–"}ms · chain {result.timings_ms.chain ?? "–"}ms
            · total {result.timings_ms.total}ms
          </span>
          {result.next_action === "sign_freeze" ? (
            <button
              className={s.btn}
              disabled={freeze.busy}
              onClick={() => void freeze.run({ action: "toggle_freeze", params: { frozen: true } })}
              type="button"
            >
              {freeze.busy ? "Waiting for wallet…" : "Approve freeze in wallet"}
            </button>
          ) : null}
          {freeze.signature ? <span style={{ color: "var(--frozen)" }}>Vault frozen on-chain.</span> : null}
          {freeze.error ? <span className={s.danger}>{freeze.error}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
