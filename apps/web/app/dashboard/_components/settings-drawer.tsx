"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { explorerAddressUrl } from "@speakpay/shared";
import { CircleHelp, Info, LogOut, Moon, Timer, UserRound, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";

import s from "../dashboard.module.css";
import { short } from "./status-chip";
import { CANCEL_WINDOW_KEY, USERNAME_KEY, useLocalSetting } from "./use-local-setting";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

/** First letter of the username, or a person icon until one is set. */
export function Avatar({ username, size = 20 }: { username: string; size?: number }) {
  return username ? <>{username.charAt(0).toUpperCase()}</> : <UserRound size={size} strokeWidth={1.75} />;
}

// Profile & settings (Phantom-style drawer). Everything here is stored on this device only.
export function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const { publicKey, wallet, disconnect } = useWallet();
  const owner = publicKey?.toBase58() ?? null;
  const [username, setUsername] = useLocalSetting(USERNAME_KEY, "");
  const [draft, setDraft] = useState(username);
  const [cancelWindow, setCancelWindow] = useLocalSetting(CANCEL_WINDOW_KEY, "5");
  const draftOk = draft === "" || USERNAME_RE.test(draft);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div aria-hidden className={s.overlay} onClick={onClose} />
      <aside aria-label="Profile and settings" aria-modal="true" className={s.drawer} role="dialog">
        <div className={s.row}>
          <span className={`${s.avatar} ${s.avatarLg}`}>
            <Avatar size={26} username={username} />
          </span>
          <button aria-label="Close settings" className={s.iconBtn} onClick={onClose} type="button">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div>
          <h2 className={s.h1} style={{ fontSize: 26 }}>
            {username ? `@${username}` : "Your profile"}
          </h2>
          {owner ? <p className={`${s.muted} ${s.mono}`}>{short(owner, 6)}</p> : null}
        </div>

        <span className={s.label}>Profile</span>
        <div className={s.settingsGroup}>
          <div className={s.settingsRow} style={{ alignItems: "flex-start" }}>
            <UserRound size={20} strokeWidth={1.75} />
            <div className={s.stack} style={{ gap: 6 }}>
              <span>Username</span>
              <input
                aria-invalid={!draftOk}
                className={`${s.input} ${draftOk ? "" : s.inputError}`}
                maxLength={20}
                onBlur={() => draftOk && setUsername(draft)}
                onChange={(e) => setDraft(e.target.value.toLowerCase().replace(/^@/, ""))}
                onKeyDown={(e) => e.key === "Enter" && draftOk && setUsername(draft)}
                placeholder="@username"
                value={draft}
              />
              <span className={`${s.muted} ${s.small}`}>
                {draftOk ? "3–20 letters, numbers or _. Saved on this device." : "Use 3–20 lowercase letters, numbers or _."}
              </span>
            </div>
          </div>
        </div>

        <span className={s.label}>Payments</span>
        <div className={s.settingsGroup}>
          <div className={s.settingsRow} style={{ alignItems: "flex-start" }}>
            <Timer size={20} strokeWidth={1.75} />
            <div className={s.stack} style={{ gap: 8 }}>
              <span>Cancel window before paying</span>
              <div className={s.chipRow}>
                {["3", "5", "10"].map((v) => (
                  <button
                    className={`${s.choice} ${cancelWindow === v ? s.choiceActive : ""}`}
                    disabled
                    key={v}
                    onClick={() => setCancelWindow(v)}
                    type="button"
                  >
                    {v}s
                  </button>
                ))}
              </div>
              <span className={`${s.muted} ${s.small}`}>Coming in the next update — it needs a small server change first.</span>
            </div>
          </div>
        </div>

        <span className={s.label}>Appearance</span>
        <div className={s.settingsGroup}>
          <div className={s.settingsRow}>
            <Moon size={20} strokeWidth={1.75} />
            <span>Light or dark</span>
            <span className={`${s.muted} ${s.small}`}>Follows your device</span>
          </div>
        </div>

        {owner ? (
          <>
            <span className={s.label}>Wallet</span>
            <div className={s.settingsGroup}>
              <a className={s.settingsRow} href={explorerAddressUrl(owner)} rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }} target="_blank">
                <Wallet size={20} strokeWidth={1.75} />
                <span>{wallet?.adapter.name ?? "Wallet"}</span>
                <span className={`${s.muted} ${s.mono}`}>{short(owner, 4)}</span>
              </a>
              <button
                className={s.settingsRow}
                onClick={() => {
                  onClose();
                  void disconnect();
                }}
                style={{ background: "none", border: 0, color: "var(--blocked)", cursor: "pointer", textAlign: "left", width: "100%" }}
                type="button"
              >
                <LogOut size={20} strokeWidth={1.75} />
                <span>Disconnect</span>
              </button>
            </div>
          </>
        ) : null}

        <span className={s.label}>Support</span>
        <div className={s.settingsGroup}>
          <a className={s.settingsRow} href="https://github.com/jayo14/speakpay#readme" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }} target="_blank">
            <CircleHelp size={20} strokeWidth={1.75} />
            <span>Help &amp; support</span>
          </a>
          <div className={s.settingsRow}>
            <Info size={20} strokeWidth={1.75} />
            <span>About SpeakPay</span>
            <span className={`${s.muted} ${s.small}`}>Solana Devnet · no real funds</span>
          </div>
        </div>
      </aside>
    </>
  );
}
