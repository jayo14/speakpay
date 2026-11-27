import s from "../dashboard.module.css";

// Phantom-style progress dots for the 3-step setup: connect · rules · funds.
export function SetupDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div aria-label={`Setup step ${step} of 3`} className={s.dots} role="img">
      {[1, 2, 3].map((n) => (
        <span className={`${s.dot} ${n === step ? s.dotOn : ""}`} key={n} />
      ))}
    </div>
  );
}
