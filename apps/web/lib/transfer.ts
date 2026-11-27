import "server-only";

import {
  PublicKey,
  SendTransactionError,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { ix, parsePolicyError, type ParsedPolicyError } from "@speakpay/shared";

import { agentDelegate, connection } from "./solana";
import { withTimeout } from "./timeout";

export type TransferResult =
  | { ok: true; signature: string; logs: string[] }
  | {
      ok: false;
      /** Set when the failed tx landed on-chain (skipPreflight); null if rejected in simulation. */
      signature: string | null;
      policyError: ParsedPolicyError | null;
      code: string; // PolicyError name, or a pipeline code like CHAIN_TIMEOUT
      logs: string[];
    };

export interface TransferArgs {
  programId: PublicKey;
  policyVault: PublicKey;
  vaultFunds: PublicKey;
  recipient: PublicKey;
  amountLamports: number;
  evidenceHash: Uint8Array;
  /** true only for the rogue proof (PRD D9): lets the validator record the failure. */
  skipPreflight: boolean;
}

/** Agent delegate signs and submits execute_guarded_transfer (PRD §4.2 #4). */
export async function sendGuardedTransfer(a: TransferArgs): Promise<TransferResult> {
  const conn = connection();
  const delegate = agentDelegate();

  const instruction = ix.executeGuardedTransfer(
    {
      programId: a.programId,
      policyVault: a.policyVault,
      vaultFunds: a.vaultFunds,
      agentDelegate: delegate.publicKey,
      recipient: a.recipient,
    },
    a.amountLamports,
    a.evidenceHash,
  );

  let blockhash: string;
  let lastValidBlockHeight: number;
  try {
    ({ blockhash, lastValidBlockHeight } = await withTimeout(conn.getLatestBlockhash("confirmed"), 8_000, "blockhash"));
  } catch {
    return { ok: false, signature: null, policyError: null, code: "CHAIN_UNREACHABLE", logs: [] };
  }

  const tx = new VersionedTransaction(
    new TransactionMessage({ payerKey: delegate.publicKey, recentBlockhash: blockhash, instructions: [instruction] })
      .compileToLegacyMessage(),
  );
  tx.sign([delegate]);

  let signature: string;
  try {
    signature = await withTimeout(
      conn.sendRawTransaction(tx.serialize(), {
        skipPreflight: a.skipPreflight,
        preflightCommitment: "confirmed",
        maxRetries: 3,
      }),
      10_000,
      "sendRawTransaction",
    );
  } catch (e) {
    if (e instanceof SendTransactionError) {
      const logs = (await e.getLogs(conn).catch(() => e.logs)) ?? [];
      const policyError = parsePolicyError(null, logs);
      return { ok: false, signature: null, policyError, code: policyError?.name ?? "SIMULATION_FAILED", logs };
    }
    return { ok: false, signature: null, policyError: null, code: "CHAIN_SEND_FAILED", logs: [] };
  }

  try {
    const { value } = await withTimeout(
      conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed"),
      30_000,
      "confirmTransaction",
    );
    const landed = await conn
      .getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 })
      .catch(() => null);
    const logs = landed?.meta?.logMessages ?? [];
    if (value.err) {
      const policyError = parsePolicyError(value.err, logs);
      return { ok: false, signature, policyError, code: policyError?.name ?? "TX_FAILED", logs };
    }
    return { ok: true, signature, logs };
  } catch {
    // Sent but unconfirmed within budget: report the signature so it can be checked on Explorer.
    return { ok: false, signature, policyError: null, code: "CHAIN_TIMEOUT", logs: [] };
  }
}
