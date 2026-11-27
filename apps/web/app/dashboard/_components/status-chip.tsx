import type { RunStatus } from "@speakpay/shared";

import s from "../dashboard.module.css";

const TONE: Record<RunStatus, string> = {
  PASSED: "var(--pass)",
  INJECTION_BLOCKED: "var(--block)",
  ONCHAIN_REJECTED: "var(--block)",
  PRECHECK_FAILED: "var(--block)",
  ERROR: "var(--block)",
  FROZEN: "var(--frozen)",
  FREEZE_REQUESTED: "var(--frozen)",
};

export function StatusChip({ status }: { status: RunStatus }) {
  return (
    <span className={s.chip} style={{ color: TONE[status] }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export const short = (v: string, n = 6) => (v.length > n * 2 + 2 ? `${v.slice(0, n)}…${v.slice(-n)}` : v);
