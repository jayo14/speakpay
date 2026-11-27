"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { explorerAddressUrl } from "@speakpay/shared";
import { CircleHelp, ExternalLink, Info, LogOut, Moon, MonitorSmartphone, Timer, X } from "lucide-react";
import { useEffect, useState } from "react";

import s from "../dashboard.module.css";
import { AVATAR_COLORS, Avatar } from "./avatar";
import { USERNAME_RE } from "./profile-step";
import { short } from "./status-chip";
import { AVATAR_KEY, CANCEL_WINDOW_KEY, USERNAME_KEY, useLocalSetting } from "./use-local-setting";
import { useTheme } from "./use-theme";

function Switch({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button aria-checked={on} aria-label={label} className={`${s.switch} ${on ? s.switchOn : ""}`} disabled={disabled} onClick={() => onChange(!on)} role="switch" type="button">
      <span className={s.switchKnob} />
    </button>
  );
}

// Profile & settings. Plain rows; only the wallet sits in a card. Everything is stored on this device.
export function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const { publicKey, wallet, disconnect } = useWallet();
  const owner = publicKey?.toBase58() ?? null;
  const [username, setUsername] = useLocalSetting(USERNAME_KEY, "");
  const [avatar, setAvatar] = useLocalSetting(AVATAR_KEY, "lavender");
  const [draft, setDraft] = useState(username);
  const [cancelWindow, setCancelWindow] = useLocalSetting(CANCEL_WINDOW_KEY, "5");
  const theme = useTheme();
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
          <Avatar color={avatar} size={64} username={username} />
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

        <section className={s.section}>
          <span className={s.label}>Profile</span>
          <label className={s.stack} style={{ gap: 6 }}>
            <span>Username</span>
            <input
              aria-invalid={!draftOk}
              className={`${s.input} ${draftOk ? "" : s.inputError}`}
              maxLength={20}
              onBlur={() => draftOk && setUsername(draft)}
              onChange={(e) => setDraft(e.target.value.toLowerCase().replace(/^@/, "").replace(/\s/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && draftOk && setUsername(draft)}
              placeholder="@username"
              value={draft}
            />
          </label>
          <div className={s.stack} style={{ gap: 8 }}>
            <span>Avatar colour</span>
            <div className={s.chipRow} role="radiogroup">
              {AVATAR_COLORS.map((c) => (
                <button
                  aria-checked={avatar === c.id}
                  aria-label={c.id}
                  className={`${s.swatch} ${s.swatchSm} ${avatar === c.id ? s.swatchOn : ""}`}
                  key={c.id}
                  onClick={() => setAvatar(c.id)}
                  role="radio"
                  style={{ background: c.bg }}
                  type="button"
                />
              ))}
            </div>
          </div>
        </section>

        <section className={s.section}>
          <span className={s.label}>Payments</span>
          <div className={s.plainRow} style={{ alignItems: "flex-start" }}>
            <Timer size={20} strokeWidth={1.75} />
            <div className={s.stack} style={{ gap: 8 }}>
              <span>Cancel window before paying</span>
              <div className={s.chipRow}>
                {["3", "5", "10"].map((v) => (
                  <button className={`${s.choice} ${cancelWindow === v ? s.choiceActive : ""}`} disabled key={v} onClick={() => setCancelWindow(v)} type="button">
                    {v}s
                  </button>
                ))}
              </div>
              <span className={`${s.muted} ${s.small}`}>Coming in the next update — it needs a small server change first.</span>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <span className={s.label}>Appearance</span>
          <div className={s.plainRow}>
            <MonitorSmartphone size={20} strokeWidth={1.75} />
            <span>Match my device</span>
            <Switch label="Match my device" on={theme.pref === "system"} onChange={(v) => theme.setPref(v ? "system" : theme.dark ? "dark" : "light")} />
          </div>
          <div className={s.plainRow}>
            <Moon size={20} strokeWidth={1.75} />
            <span>Dark mode</span>
            <Switch disabled={theme.pref === "system"} label="Dark mode" on={theme.dark} onChange={(v) => theme.setPref(v ? "dark" : "light")} />
          </div>
        </section>

        {owner ? (
          <section className={s.section}>
            <span className={s.label}>Wallet</span>
            <div className={s.settingsGroup}>
              <a className={s.settingsRow} href={explorerAddressUrl(owner)} rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }} target="_blank">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {wallet?.adapter.icon ? <img alt="" height={28} src={wallet.adapter.icon} style={{ borderRadius: 8 }} width={28} /> : null}
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
          </section>
        ) : null}

        <section className={s.section}>
          <span className={s.label}>Support</span>
          <a className={s.plainRow} href="https://github.com/jayo14/speakpay#readme" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }} target="_blank">
            <CircleHelp size={20} strokeWidth={1.75} />
            <span>Help &amp; support</span>
            <ExternalLink size={16} strokeWidth={1.75} />
          </a>
          <div className={s.plainRow}>
            <Info size={20} strokeWidth={1.75} />
            <span>About SpeakPay</span>
            <span className={`${s.muted} ${s.small}`}>Devnet · no real funds</span>
          </div>
        </section>
      </aside>
    </>
  );
}
