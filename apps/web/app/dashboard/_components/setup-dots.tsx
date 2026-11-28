import s from "../dashboard.module.css";

// Phantom-style progress dots for setup: connect · profile · rules · funds.
export function SetupDots({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div aria-label={`Setup step ${step} of 4`} className={s.dots} role="img">
      {[1, 2, 3, 4].map((n) => (
        <span className={`${s.dot} ${n === step ? s.dotOn : ""} ${n < step ? s.dotDone : ""}`} key={n} />
      ))}
    </div>
  );
}
