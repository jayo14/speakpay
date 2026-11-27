import "server-only";

import { Connection, Keypair, PublicKey } from "@solana/web3.js";

import { requireEnv } from "./env";

let conn: Connection | undefined;
let delegate: Keypair | undefined;

export function connection(): Connection {
  conn ??= new Connection(requireEnv("SOLANA_RPC_URL"), "confirmed");
  return conn;
}

export function programId(): PublicKey {
  return new PublicKey(requireEnv("NEXT_PUBLIC_POLICY_VAULT_PROGRAM_ID"));
}

/**
 * The agent delegate signer. AGENT_DELEGATE_SECRET_KEY is the one-line JSON
 * array of 64 numbers from agent-delegate.json (ENVIRONMENT.md §2.2).
 */
export function agentDelegate(): Keypair {
  if (delegate) return delegate;
  let bytes: unknown;
  try {
    bytes = JSON.parse(requireEnv("AGENT_DELEGATE_SECRET_KEY"));
  } catch {
    throw new Error("AGENT_DELEGATE_SECRET_KEY is not valid JSON");
  }
  if (
    !Array.isArray(bytes) ||
    bytes.length !== 64 ||
    !bytes.every((b) => Number.isInteger(b) && b >= 0 && b <= 255)
  ) {
    throw new Error("AGENT_DELEGATE_SECRET_KEY must be a JSON array of 64 bytes");
  }
  delegate = Keypair.fromSecretKey(Uint8Array.from(bytes as number[]));
  return delegate;
}
