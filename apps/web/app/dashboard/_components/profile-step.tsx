"use client";

import { useState } from "react";

import s from "../dashboard.module.css";
import { AVATAR_COLORS, Avatar } from "./avatar";
import { SetupDots } from "./setup-dots";
import { AVATAR_KEY, PROFILE_DONE_KEY, USERNAME_KEY, useLocalSetting } from "./use-local-setting";

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// Setup step 2: a username and an avatar colour. Saved on this device only; skippable.
export function ProfileStep() {
  const [, setUsername] = useLocalSetting(USERNAME_KEY, "");
  const [avatar, setAvatar] = useLocalSetting(AVATAR_KEY, "lavender");
  const [, setDone] = useLocalSetting(PROFILE_DONE_KEY, "");
  const [draft, setDraft] = useState("");
  const ok = USERNAME_RE.test(draft);

  return (
    <div className={s.content}>
      <div className={s.row} style={{ flexWrap: "nowrap" }}>
        <span style={{ width: 40 }} />
        <SetupDots step={2} />
        <button className={s.linkBtn} onClick={() => setDone("1")} style={{ width: 40, justifyContent: "flex-end" }} type="button">
          Skip
        </button>
      </div>
      <div>
        <h1 className={s.h1}>Choose a username</h1>
        <p className={s.lead}>It&apos;s how SpeakPay greets you. No real name or email needed.</p>
      </div>

      <div className={s.stack} style={{ alignItems: "center", gap: 16, padding: "8px 0" }}>
        <span className={s.avatarPop} key={`${avatar}:${draft.charAt(0)}`}>
          <Avatar color={avatar} size={88} username={draft} />
        </span>
        <div aria-label="Avatar colour" className={s.chipRow} role="radiogroup" style={{ justifyContent: "center" }}>
          {AVATAR_COLORS.map((c) => (
            <button
              aria-checked={avatar === c.id}
              aria-label={c.id}
              className={`${s.swatch} ${avatar === c.id ? s.swatchOn : ""}`}
              key={c.id}
              onClick={() => setAvatar(c.id)}
              role="radio"
              style={{ background: c.bg }}
              type="button"
            />
          ))}
        </div>
      </div>

      <label className={s.stack} style={{ gap: 6 }}>
        <span className={s.label}>Username</span>
        <input
          autoComplete="off"
          className={`${s.input} ${draft && !ok ? s.inputError : ""}`}
          maxLength={20}
          onChange={(e) => setDraft(e.target.value.toLowerCase().replace(/^@/, "").replace(/\s/g, ""))}
          placeholder="@username"
          value={draft}
        />
        <span className={`${s.muted} ${s.small}`}>3–20 lowercase letters, numbers or _</span>
      </label>

      <button
        className={s.btn}
        disabled={!ok}
        onClick={() => {
          setUsername(draft);
          setDone("1");
        }}
        type="button"
      >
        Continue
      </button>
    </div>
  );
}
