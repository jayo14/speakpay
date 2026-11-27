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
export function Dashboard({ readOnlyVault }: { readOnlyVault: string | null }) {
  const { publicKey } = useWallet();
  const owner = readOnlyVault ? null : (publicKey?.toBase58() ?? null);
  const vault = useVault(owner);
  const vaultPda = readOnlyVault ?? vault.data?.vault?.vault_pda ?? null;

  return (
    <main className={s.page}>
      <header className={s.header}>
        <h1 className={s.brand}>SpeakPay</h1>
        <p className={s.sub}>
          {readOnlyVault ? "Live audit feed — read only" : "Web companion"} · Solana Devnet
        </p>
      </header>

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
            {owner ? <VaultPanel data={vault.data} onChanged={vault.refresh} /> : null}
          </section>
          <section className={s.col} aria-label="Voice console">
            <h2 className={s.h2}>Voice console</h2>
            {owner && vault.data?.vault ? (
              <VoiceConsole onRun={vault.refresh} owner={owner} vaultPda={vault.data.vault.vault_pda} />
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
