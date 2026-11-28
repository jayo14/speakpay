"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import type { OwnerAction, OwnerTxResponse, VaultReadResponse, VaultSyncResponse } from "@speakpay/shared";
import { useCallback, useEffect, useState } from "react";

import { apiGet, apiPost, errorText } from "@/lib/client/api";

/** Live vault state for an owner via GET /api/vault/[owner], refreshed every 15 s. */
export function useVault(owner: string | null) {
  // Tagged with its owner so a previous wallet's vault is never shown after switching.
  const [state, setState] = useState<{ owner: string; data: VaultReadResponse } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Bumped by refresh() (event handlers) to re-run the fetch effect.
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    const load = () =>
      apiGet<VaultReadResponse>(`/api/vault/${owner}`).then(
        (data) => {
          if (cancelled) return;
          setState({ owner, data });
          setError(null);
        },
        (e: unknown) => {
          if (!cancelled) setError(errorText(e));
        },
      );
    void load();
    const id = setInterval(() => void load(), 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [owner, version]);

  const data = owner && state?.owner === owner ? state.data : null;
  const loading = !!owner && !data && !error;
  return { data, error: owner ? error : null, loading, refresh };
}

/** Owner action: server builds unsigned tx → wallet signs + sends → confirm → /api/vault/sync (PRD D7). */
export function useOwnerAction(onDone: () => void) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const run = useCallback(
    async (action: Omit<OwnerAction, "owner_pubkey">): Promise<string | null> => {
      if (!publicKey) return null;
      setBusy(true);
      setError(null);
      try {
        const owner = publicKey.toBase58();
        const built = await apiPost<OwnerTxResponse>("/api/tx/owner", { ...action, owner_pubkey: owner });
        const tx = VersionedTransaction.deserialize(Buffer.from(built.transaction_base64, "base64"));
        const sig = await sendTransaction(tx, connection);
        const { value } = await connection.confirmTransaction(
          { signature: sig, blockhash: built.recent_blockhash, lastValidBlockHeight: built.last_valid_block_height },
          "confirmed",
        );
        if (value.err) throw new Error(`Transaction failed on-chain: ${JSON.stringify(value.err)}`);
        await apiPost<VaultSyncResponse>("/api/vault/sync", { owner_pubkey: owner, tx_signature: sig });
        setSignature(sig);
        return sig;
      } catch (e) {
        const msg = errorText(e);
        if (!/rejected/i.test(msg)) {
          const bal = await connection.getBalance(publicKey).catch(() => null);
          if (bal === 0) {
            setError("Your wallet has 0 SOL on Solana Devnet. Get test SOL at faucet.solana.com and switch your wallet to Devnet.");
            return null;
          }
        }
        setError(msg);
        return null;
      } finally {
        setBusy(false);
        onDone();
      }
    },
    [publicKey, sendTransaction, connection, onDone],
  );

  return { run, busy, error, signature };
}
