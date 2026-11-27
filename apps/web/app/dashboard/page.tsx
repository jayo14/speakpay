// Web Companion (PRD §8.3). Wallet, voice console and live feed land in Block 3.
export default function DashboardPage() {
  return (
    <main className="shell">
      <h1>SpeakPay</h1>
      <p>Web companion — Solana Devnet.</p>
      <hr className="rule" />
      <p>
        System status: <a href="/api/health">/api/health</a>
      </p>
    </main>
  );
}
