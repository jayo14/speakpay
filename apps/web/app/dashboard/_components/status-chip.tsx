import { CircleCheck, ShieldX, Snowflake, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import type { Tone } from "@/lib/client/describe-run";

import s from "../dashboard.module.css";

export function TonePill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`${s.status} ${s[`tone_${tone}`]}`}>{children}</span>;
}

const ICON = { paid: CircleCheck, blocked: ShieldX, frozen: Snowflake, neutral: TriangleAlert } as const;

/** Round tinted icon used in lists, receipts and the result card. */
export function ToneIcon({ tone, size = 44 }: { tone: Tone; size?: number }) {
  const Icon = ICON[tone];
  return (
    <span className={`${s.listIcon} ${s[`tone_${tone}`]}`} style={{ height: size, width: size }}>
      <Icon aria-hidden size={size * 0.48} strokeWidth={1.75} />
    </span>
  );
}

export const short = (v: string, n = 6) => (v.length > n * 2 + 2 ? `${v.slice(0, n)}…${v.slice(-n)}` : v);
