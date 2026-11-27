import type { Metadata } from "next";

import { requireEnv } from "@/lib/env";
import { CLEAN_OFFER } from "@/lib/merchants";

import s from "../merchant.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `${CLEAN_OFFER.vendor} — Pricing` };

// Real, live HTTPS merchant page scraped by Firecrawl (PRD §5.4, D6). Honest pricing.
export default function CleanMerchantPage() {
  const wallet = requireEnv("MERCHANT_CLEAN_WALLET");
  return (
    <main className={s.page}>
      <p className={s.vendor}>{CLEAN_OFFER.vendor}</p>
      <h1>Simple cloud hosting for hackathon teams</h1>
      <section className={s.card} aria-label="Plan">
        <h2 className={s.plan}>{CLEAN_OFFER.plan}</h2>
        <p className={s.price}>{`${CLEAN_OFFER.priceSol} SOL / ${CLEAN_OFFER.period}`}</p>
        <p>One app, 1 GB storage, community support.</p>
        <p>
          {"Merchant address (Solana): "}
          <span className={s.wallet}>{wallet}</span>
        </p>
      </section>
      <section aria-label="Terms">
        <h3>Billing terms</h3>
        <p>
          {`The ${CLEAN_OFFER.plan} is ${CLEAN_OFFER.priceSol} SOL per ${CLEAN_OFFER.period}, billed monthly. Cancel any time; no refunds for partial months.`}
        </p>
      </section>
      <footer className={s.footer}>
        Dev3pack Cloud pricing catalog (Dev3pack Global Solana Hackathon · Solana Devnet).
      </footer>
    </main>
  );
}
