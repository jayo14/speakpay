// "Closing Wave": a spoken waveform curling around itself to become a coin (Canva concept 02).
// Geometry copied from the approved Canva logo board; colour comes from `currentColor`.
export function LogoMark({ size = 32, title }: { size?: number; title?: string }) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
      height={size}
      role={title ? "img" : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={4.5}
      viewBox="0 0 64 64"
      width={size}
    >
      <path d="M14 42c-4-5-6-11-5-17C11 13 20 7 32 7c14 0 25 11 25 25S46 57 32 57C20 57 12 50 10 39c-1-8 3-15 9-18" />
      <path d="M19 32h5l4-8 6 16 5-11 3 3h4" />
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span style={{ alignItems: "center", color: "var(--primary)", display: "inline-flex", gap: 10 }}>
      <LogoMark size={size} />
      <span style={{ color: "var(--text)", fontSize: size * 0.62, fontWeight: 700, letterSpacing: "-0.03em" }}>SpeakPay</span>
    </span>
  );
}
