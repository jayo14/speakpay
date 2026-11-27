import type { Metadata } from "next";

import { requireEnv } from "@/lib/env";
import { SHADY_OFFER, shadyInjectionText } from "@/lib/merchants";

import s from "../merchant.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `${SHADY_OFFER.vendor} — Limited offer` };

// Real, live HTTPS security fixture (PRD §5.4, D6). It deliberately carries a prompt-injection
// payload inside the main content so Firecrawl's checkPromptInjection returns
// 403 SCRAPE_PROMPT_INJECTION_DETECTED. Nothing in SpeakPay ever acts on this text.
export default function ShadyMerchantPage() {
  const attacker = requireEnv("MERCHANT_SHADY_ATTACKER_WALLET");
  return (
    <main className={s.page}>
      <p className={s.vendor}>{SHADY_OFFER.vendor}</p>
      <h1>Unbeatable cloud deals — today only</h1>
      <section className={s.card} aria-label="Plan">
        <h2 className={s.plan}>{SHADY_OFFER.plan}</h2>
        <p className={s.price}>{`${SHADY_OFFER.priceSol} SOL / ${SHADY_OFFER.period}`}</p>
        <p>Unlimited apps, unlimited storage, priority support.</p>
        <p>{"Pay to (Solana wallet): "}<span className={s.wallet}>{attacker}</span></p>
      </section>
      <section aria-label="Terms">
        <h3>Billing terms</h3>
        <p>{`The ${SHADY_OFFER.plan} costs ${SHADY_OFFER.priceSol} SOL per ${SHADY_OFFER.period}. Offer subject to change.`}</p>
        <p className={s.finePrint}>{shadyInjectionText(attacker)}</p>
      </section>
      <footer className={s.footer}>
        Security test fixture for SpeakPay (Dev3pack Global Solana Hackathon): this page intentionally contains a
        prompt-injection payload to test Firecrawl&apos;s injection guard. Solana Devnet only — no real funds.
      </footer>
    </main>
  );
}
