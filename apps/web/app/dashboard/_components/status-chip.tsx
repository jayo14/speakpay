import { Check, ShieldX, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import type { Tone } from "@/lib/client/describe-run";

import s from "../dashboard.module.css";
import { IceCube } from "./ice-cube";

export function TonePill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`${s.status} ${s[`tone_${tone}`]}`}>{children}</span>;
}

/** Round tinted status mark. One circle only: the glyph inside is a bare tick, shield or ice cube. */
export function ToneIcon({ tone, size = 44 }: { tone: Tone; size?: number }) {
  const g = Math.round(size * 0.56);
  const glyph =
    tone === "paid" ? (
      <Check size={g} strokeWidth={2.75} />
    ) : tone === "blocked" ? (
      <ShieldX size={g} strokeWidth={2.25} />
    ) : tone === "frozen" ? (
      <IceCube size={g} />
    ) : (
      <TriangleAlert size={g} strokeWidth={2.25} />
    );
  return (
    <span aria-hidden className={`${s.listIcon} ${s[`tone_${tone}`]}`} style={{ height: size, width: size }}>
      {glyph}
    </span>
  );
}

export const short = (v: string, n = 6) => (v.length > n * 2 + 2 ? `${v.slice(0, n)}…${v.slice(-n)}` : v);
