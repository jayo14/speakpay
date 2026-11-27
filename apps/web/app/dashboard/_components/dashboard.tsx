"use client";

import { useWallet } from "@solana/wallet-adapter-react";

import s from "../dashboard.module.css";
import { AuditFeed } from "./audit-feed";
import { useVault } from "./use-vault";
import { VaultPanel } from "./vault-panel";
import { VoiceConsole } from "./voice-console";
import { WalletConnect } from "./wallet-connect";

// Web Companion (PRD §8.3). Same program, API and Realtime feed as the APK.
// `readOnlyVault` = /dashboard?vault=<pda>: feed only, no wallet (demo second screen).
export function Dashboard({ readOnlyVault, demoAllowlist }: { readOnlyVault: string | null; demoAllowlist: string }) {
  const { publicKey } = useWallet();
  const owner = readOnlyVault ? null : (publicKey?.toBase58() ?? null);
  const vault = useVault(owner);
  const vaultPda = readOnlyVault ?? vault.data?.vault?.vault_pda ?? null;
  const fundsLamports = vault.data?.vault_funds_lamports ?? 0;
  const step = !owner ? 1 : !vault.data?.vault || fundsLamports === 0 ? 2 : 3;

  return (
    <main className={s.page}>
      <header className={s.header}>
        <div>
          <h1 className={s.brand}>SpeakPay</h1>
          {!readOnlyVault ? (
            <p className={s.muted}>Your Devnet wallet is your account — your vault and spending limits live on-chain.</p>
          ) : null}
        </div>
        <p className={s.sub}>
          {readOnlyVault ? "Live audit feed — read only" : "Web companion"} · Solana Devnet
        </p>
      </header>

      {!readOnlyVault ? (
        <nav aria-label="Setup steps" className={s.steps}>
          <span className={`${s.step} ${step > 1 ? s.stepDone : s.stepActive}`}>
            {step > 1 ? "✓ 1. Wallet connected" : "1. Connect Devnet wallet"}
          </span>
          <span className={`${s.step} ${step > 2 ? s.stepDone : step === 2 ? s.stepActive : ""}`}>
            {step > 2 ? "✓ 2. Vault funded" : "2. Create & fund vault"}
          </span>
          <span className={`${s.step} ${step === 3 ? s.stepActive : ""}`}>
            3. Hold mic & speak to pay
          </span>
        </nav>
      ) : null}

      {readOnlyVault ? (
        <section className={s.col} aria-label="Audit feed">
          <h2 className={s.h2}>Audit feed</h2>
          <AuditFeed vaultPda={readOnlyVault} />
        </section>
      ) : (
        <div className={s.grid}>
          <section className={s.col} aria-label="Vault">
            <h2 className={s.h2}>Vault</h2>
            <WalletConnect />
            {owner && vault.loading && !vault.data ? <span className={s.muted}>Reading vault from Devnet…</span> : null}
            {vault.error ? <span className={s.danger}>{vault.error}</span> : null}
            {owner ? <VaultPanel data={vault.data} demoAllowlist={demoAllowlist} onChanged={vault.refresh} /> : null}
          </section>
          <section className={s.col} aria-label="Voice console">
            <h2 className={s.h2}>Voice console</h2>
            {owner && vault.data?.vault ? (
              <VoiceConsole
                onRun={vault.refresh}
                owner={owner}
                vaultFundsLamports={fundsLamports}
                vaultPda={vault.data.vault.vault_pda}
              />
            ) : (
              <span className={s.muted}>Connect a wallet and create a vault first.</span>
            )}
          </section>
          <section className={s.col} aria-label="Audit feed">
            <h2 className={s.h2}>Audit feed</h2>
            <AuditFeed vaultPda={vaultPda} />
          </section>
        </div>
      )}
    </main>
  );
}
