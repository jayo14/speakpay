"use client";

import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { explorerAddressUrl, lamportsToSol } from "@speakpay/shared";
import { useEffect, useState, useSyncExternalStore } from "react";

import s from "../dashboard.module.css";
import { short } from "./status-chip";

const emptySubscribe = () => () => {};

// Minimal Swiss connect control on top of useWallet() (no wallet-adapter-react-ui modal).
// Wallet Standard wallets (Phantom, Solflare) register only in the browser,
// so `wallets` is empty during SSR. We defer rendering until after mount to
// avoid a hydration mismatch (server: <p> fallback vs client: <div> wallet list).
export function WalletConnect() {
  const { wallets, wallet, publicKey, select, disconnect, connecting } = useWallet();
  const { connection } = useConnection();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [balance, setBalance] = useState<{ owner: string; lamports: number } | null>(null);
  const ownerKey = publicKey?.toBase58() ?? null;

  useEffect(() => {
    if (!publicKey || !ownerKey) return;
    let cancelled = false;
    void connection.getBalance(publicKey).then(
      (lamports) => {
        if (!cancelled) setBalance({ owner: ownerKey, lamports });
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [connection, publicKey, ownerKey]);

  const balanceLamports = ownerKey && balance?.owner === ownerKey ? balance.lamports : null;

  const installed = wallets.filter(
    (w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable,
  );

  if (publicKey) {
    return (
      <div className={s.card}>
        <div className={s.row}>
          <span className={s.label}>Owner wallet · {wallet?.adapter.name}</span>
          {balanceLamports !== null ? <span className={s.mono}>{lamportsToSol(balanceLamports)} SOL</span> : null}
        </div>
        <a className={s.mono} href={explorerAddressUrl(publicKey.toBase58())} target="_blank" rel="noreferrer">
          {short(publicKey.toBase58(), 8)}
        </a>
        {balanceLamports !== null && balanceLamports < 50_000_000 ? (
          <a className={s.muted} href="https://faucet.solana.com" target="_blank" rel="noreferrer">
            Low Devnet SOL — get test SOL at faucet.solana.com ↗
          </a>
        ) : null}
        <button className={s.btnSecondary} onClick={() => void disconnect()} type="button">
          Disconnect
        </button>
      </div>
    );
  }

  // Before mount, always show the fallback so SSR and initial client HTML match.
  const showWallets = mounted && installed.length > 0;

  return (
    <div className={s.card}>
      <span className={s.label}>Connect a Devnet wallet</span>
      {showWallets ? (
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
      ) : (
        <p className={s.muted}>Install Phantom or Solflare in this browser and switch it to Devnet.</p>
      )}
      <span className={s.muted}>
        Enable Developer Settings → Testnet Mode (Devnet) in Phantom, and fund at{" "}
        <a href="https://faucet.solana.com" rel="noreferrer" target="_blank">
          faucet.solana.com ↗
        </a>
        .
      </span>
    </div>
  );
}
