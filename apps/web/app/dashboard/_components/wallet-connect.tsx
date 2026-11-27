"use client";

import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { explorerAddressUrl } from "@speakpay/shared";

import s from "../dashboard.module.css";
import { short } from "./status-chip";

// Minimal Swiss connect control on top of useWallet() (no wallet-adapter-react-ui modal).
export function WalletConnect() {
  const { wallets, wallet, publicKey, select, disconnect, connecting } = useWallet();
  const installed = wallets.filter(
    (w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable,
  );

  if (publicKey) {
    return (
      <div className={s.card}>
        <span className={s.label}>Owner wallet · {wallet?.adapter.name}</span>
        <a className={s.mono} href={explorerAddressUrl(publicKey.toBase58())} target="_blank" rel="noreferrer">
          {short(publicKey.toBase58(), 8)}
        </a>
        <button className={s.btnSecondary} onClick={() => void disconnect()} type="button">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={s.card}>
      <span className={s.label}>Connect a Devnet wallet</span>
      {installed.length === 0 ? (
        <p className={s.muted}>Install Phantom or Solflare in this browser and switch it to Devnet.</p>
      ) : (
        <div className={s.walletList}>
          {installed.map((w) => (
            <button
              className={s.btn}
              disabled={connecting}
              key={w.adapter.name}
              // WalletProvider autoConnect connects as soon as a wallet is selected.
              onClick={() => select(w.adapter.name)}
              type="button"
            >
              {connecting && wallet?.adapter.name === w.adapter.name ? "Connecting…" : `Connect ${w.adapter.name}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
