"use client";

import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { ChevronRight } from "lucide-react";
import { useSyncExternalStore } from "react";

import s from "../dashboard.module.css";
import { LogoMark } from "./logo";
import { SetupDots } from "./setup-dots";

const emptySubscribe = () => () => {};

// Step 1 of setup. Wallet Standard wallets (Phantom, Solflare) only register in the browser,
// so render the list after mount to keep SSR and first client render identical.
export function ConnectCard() {
  const { wallets, wallet, select, connecting } = useWallet();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const installed = wallets.filter((w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable);

  return (
    <div className={s.content}>
      <SetupDots step={1} />
      <div className={s.hero}>
        <span className={s.heroMark}>
          <LogoMark size={64} />
        </span>
        <h1 className={s.h1}>Speak to pay.</h1>
        <p className={s.lead}>Pay by voice, inside spending limits no AI can break. Your wallet is your account.</p>
      </div>
      {mounted && installed.length > 0 ? (
        <div className={s.stack}>
          {installed.map((w) => (
            <button className={s.walletRow} disabled={connecting} key={w.adapter.name} onClick={() => select(w.adapter.name)} type="button">
              {/* Wallet icons are data URIs supplied by the wallet itself. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" src={w.adapter.icon} />
              <span>
                <span className={s.listTitle} style={{ display: "block" }}>
                  {connecting && wallet?.adapter.name === w.adapter.name ? "Connecting…" : w.adapter.name}
                </span>
                <span className={s.listSub}>Connect on Solana Devnet</span>
              </span>
              <ChevronRight size={20} strokeWidth={1.75} />
            </button>
          ))}
        </div>
      ) : (
        <div className={s.card}>
          <p>Install the Phantom or Solflare browser extension to continue.</p>
        </div>
      )}
      <p className={`${s.muted} ${s.small}`}>
        Devnet only, with no real funds. In Phantom: Settings → Developer Settings → Testnet Mode. Need test SOL?{" "}
        <a href="https://faucet.solana.com" rel="noreferrer" target="_blank">
          faucet.solana.com
        </a>
      </p>
    </div>
  );
}
