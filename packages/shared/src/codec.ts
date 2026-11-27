// Hand-written client for the policy_vault program (PRD §4).
// Byte-for-byte verified against vectors produced by the Rust program itself
// (programs/policy-vault/src/lib.rs `codec_vectors` → test/vectors/program.json).
// Account-meta order mirrors the `#[derive(Accounts)]` structs in lib.rs.

import { Buffer } from "buffer";
import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";

import { MAX_ALLOWLIST, POLICY_ERROR_OFFSET, policyErrorName, type PolicyErrorName } from "./constants";

/** sha256("global:<ix>")[0..8] — Anchor instruction discriminators. */
export const IX_DISCRIMINATORS = {
  init_policy_vault: [0xed, 0x21, 0xe9, 0x1d, 0xe0, 0xd2, 0xdb, 0x0b],
  deposit: [0xf2, 0x23, 0xc6, 0x89, 0x52, 0xe1, 0xf2, 0xb6],
  update_policy: [0xd4, 0xf5, 0xf6, 0x07, 0xa3, 0x97, 0x12, 0x39],
  execute_guarded_transfer: [0xa4, 0xa2, 0x2e, 0x89, 0xe9, 0xcd, 0x8f, 0x40],
  toggle_freeze: [0x88, 0x03, 0x36, 0x5a, 0xfc, 0x86, 0x9e, 0xac],
  withdraw_all: [0x60, 0xf6, 0xa6, 0x82, 0xe5, 0x32, 0x2b, 0x46],
} as const;

/** sha256("account:PolicyVault")[0..8] */
export const POLICY_VAULT_DISCRIMINATOR = [0xb4, 0x16, 0x43, 0x30, 0x57, 0xd6, 0x9e, 0x78] as const;
/** sha256("event:ExecutionAudited")[0..8] */
export const EXECUTION_AUDITED_DISCRIMINATOR = [0x41, 0x6d, 0x91, 0xd1, 0x6a, 0x61, 0xd3, 0x30] as const;
export const POLICY_VAULT_SPACE = 327;

// ---------- Borsh writer / reader (only the types this program uses) ----------

class Writer {
  private parts: Uint8Array[] = [];
  bytes(b: ArrayLike<number>) {
    this.parts.push(Uint8Array.from(b));
    return this;
  }
  u64(v: number | bigint) {
    const n = BigInt(v);
    if (n < 0n || n > 0xffff_ffff_ffff_ffffn) throw new RangeError(`u64 out of range: ${v}`);
    const b = new Uint8Array(8);
    new DataView(b.buffer).setBigUint64(0, n, true);
    return this.bytes(b);
  }
  i64(v: number | bigint) {
    const b = new Uint8Array(8);
    new DataView(b.buffer).setBigInt64(0, BigInt(v), true);
    return this.bytes(b);
  }
  u32(v: number) {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, v, true);
    return this.bytes(b);
  }
  bool(v: boolean) {
    return this.bytes([v ? 1 : 0]);
  }
  pubkey(k: PublicKey) {
    return this.bytes(k.toBytes());
  }
  pubkeys(ks: PublicKey[]) {
    this.u32(ks.length);
    ks.forEach((k) => this.pubkey(k));
    return this;
  }
  done(): Buffer {
    return Buffer.concat(this.parts);
  }
}

class Reader {
  private o = 0;
  private view: DataView;
  constructor(private b: Uint8Array) {
    this.view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  }
  private need(n: number) {
    if (this.o + n > this.b.length) throw new RangeError("buffer too short");
  }
  bytes(n: number): Uint8Array {
    this.need(n);
    const out = this.b.slice(this.o, this.o + n);
    this.o += n;
    return out;
  }
  u64(): bigint {
    this.need(8);
    const v = this.view.getBigUint64(this.o, true);
    this.o += 8;
    return v;
  }
  i64(): bigint {
    this.need(8);
    const v = this.view.getBigInt64(this.o, true);
    this.o += 8;
    return v;
  }
  u32(): number {
    this.need(4);
    const v = this.view.getUint32(this.o, true);
    this.o += 4;
    return v;
  }
  u8(): number {
    return this.bytes(1)[0]!;
  }
  bool(): boolean {
    return this.u8() !== 0;
  }
  pubkey(): PublicKey {
    return new PublicKey(this.bytes(32));
  }
}

const toHex = (b: Uint8Array) => Buffer.from(b).toString("hex");

function safeNumber(v: bigint, field: string): number {
  if (v > BigInt(Number.MAX_SAFE_INTEGER) || v < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError(`${field} exceeds JS safe integer range`);
  }
  return Number(v);
}

function startsWith(b: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((x, i) => b[i] === x);
}

// ---------- Instruction data ----------

export interface PolicyArgs {
  maxPerTxLamports: number | bigint;
  dailyCapLamports: number | bigint;
  cooldownSecs: number;
  allowlist: PublicKey[];
}

function checkAllowlist(allowlist: PublicKey[]) {
  if (allowlist.length > MAX_ALLOWLIST) throw new RangeError(`allowlist exceeds ${MAX_ALLOWLIST} entries`);
}

export const encode = {
  initPolicyVault(agentDelegate: PublicKey, p: PolicyArgs): Buffer {
    checkAllowlist(p.allowlist);
    return new Writer()
      .bytes(IX_DISCRIMINATORS.init_policy_vault)
      .pubkey(agentDelegate)
      .u64(p.maxPerTxLamports)
      .u64(p.dailyCapLamports)
      .i64(p.cooldownSecs)
      .pubkeys(p.allowlist)
      .done();
  },
  deposit(amountLamports: number | bigint): Buffer {
    return new Writer().bytes(IX_DISCRIMINATORS.deposit).u64(amountLamports).done();
  },
  updatePolicy(p: PolicyArgs, agentDelegate: PublicKey): Buffer {
    checkAllowlist(p.allowlist);
    return new Writer()
      .bytes(IX_DISCRIMINATORS.update_policy)
      .u64(p.maxPerTxLamports)
      .u64(p.dailyCapLamports)
      .i64(p.cooldownSecs)
      .pubkeys(p.allowlist)
      .pubkey(agentDelegate)
      .done();
  },
  executeGuardedTransfer(amountLamports: number | bigint, evidenceHash: Uint8Array): Buffer {
    if (evidenceHash.length !== 32) throw new RangeError("evidence_hash must be 32 bytes");
    return new Writer()
      .bytes(IX_DISCRIMINATORS.execute_guarded_transfer)
      .u64(amountLamports)
      .bytes(evidenceHash)
      .done();
  },
  toggleFreeze(frozen: boolean): Buffer {
    return new Writer().bytes(IX_DISCRIMINATORS.toggle_freeze).bool(frozen).done();
  },
  withdrawAll(): Buffer {
    return new Writer().bytes(IX_DISCRIMINATORS.withdraw_all).done();
  },
};

// ---------- Instructions (account order == lib.rs Accounts structs) ----------

export interface VaultAccounts {
  programId: PublicKey;
  owner: PublicKey;
  policyVault: PublicKey;
  vaultFunds: PublicKey;
}

const sys = { pubkey: SystemProgram.programId, isSigner: false, isWritable: false };

export const ix = {
  initPolicyVault(a: VaultAccounts, agentDelegate: PublicKey, p: PolicyArgs) {
    return new TransactionInstruction({
      programId: a.programId,
      keys: [
        { pubkey: a.owner, isSigner: true, isWritable: true },
        { pubkey: a.policyVault, isSigner: false, isWritable: true },
        { pubkey: a.vaultFunds, isSigner: false, isWritable: false },
        sys,
      ],
      data: encode.initPolicyVault(agentDelegate, p),
    });
  },
  deposit(a: VaultAccounts, amountLamports: number | bigint) {
    return new TransactionInstruction({
      programId: a.programId,
      keys: [
        { pubkey: a.owner, isSigner: true, isWritable: true },
        { pubkey: a.policyVault, isSigner: false, isWritable: false },
        { pubkey: a.vaultFunds, isSigner: false, isWritable: true },
        sys,
      ],
      data: encode.deposit(amountLamports),
    });
  },
  updatePolicy(a: VaultAccounts, p: PolicyArgs, agentDelegate: PublicKey) {
    return new TransactionInstruction({
      programId: a.programId,
      keys: [
        { pubkey: a.owner, isSigner: true, isWritable: false },
        { pubkey: a.policyVault, isSigner: false, isWritable: true },
      ],
      data: encode.updatePolicy(p, agentDelegate),
    });
  },
  toggleFreeze(a: VaultAccounts, frozen: boolean) {
    return new TransactionInstruction({
      programId: a.programId,
      keys: [
        { pubkey: a.owner, isSigner: true, isWritable: false },
        { pubkey: a.policyVault, isSigner: false, isWritable: true },
      ],
      data: encode.toggleFreeze(frozen),
    });
  },
  withdrawAll(a: VaultAccounts) {
    return new TransactionInstruction({
      programId: a.programId,
      keys: [
        { pubkey: a.owner, isSigner: true, isWritable: true },
        { pubkey: a.policyVault, isSigner: false, isWritable: false },
        { pubkey: a.vaultFunds, isSigner: false, isWritable: true },
        sys,
      ],
      data: encode.withdrawAll(),
    });
  },
  executeGuardedTransfer(
    a: Omit<VaultAccounts, "owner"> & { agentDelegate: PublicKey; recipient: PublicKey },
    amountLamports: number | bigint,
    evidenceHash: Uint8Array,
  ) {
    return new TransactionInstruction({
      programId: a.programId,
      keys: [
        { pubkey: a.agentDelegate, isSigner: true, isWritable: true },
        { pubkey: a.policyVault, isSigner: false, isWritable: true },
        { pubkey: a.vaultFunds, isSigner: false, isWritable: true },
        { pubkey: a.recipient, isSigner: false, isWritable: true },
        sys,
      ],
      data: encode.executeGuardedTransfer(amountLamports, evidenceHash),
    });
  },
};

// ---------- Account & event decoding ----------

export interface DecodedPolicyVault {
  owner: string;
  agent_delegate: string;
  max_per_tx_lamports: number;
  daily_cap_lamports: number;
  daily_spent_lamports: number;
  window_start_ts: number;
  cooldown_secs: number;
  last_tx_ts: number;
  is_frozen: boolean;
  allowlist: string[];
  last_evidence_hash: string;
  tx_count: number;
  bump: number;
  funds_bump: number;
}

export function decodePolicyVault(data: Uint8Array): DecodedPolicyVault {
  if (!startsWith(data, POLICY_VAULT_DISCRIMINATOR)) throw new TypeError("not a PolicyVault account");
  const r = new Reader(data);
  r.bytes(8);
  const owner = r.pubkey().toBase58();
  const agent_delegate = r.pubkey().toBase58();
  const max_per_tx_lamports = safeNumber(r.u64(), "max_per_tx");
  const daily_cap_lamports = safeNumber(r.u64(), "daily_cap");
  const daily_spent_lamports = safeNumber(r.u64(), "daily_spent");
  const window_start_ts = safeNumber(r.i64(), "window_start_ts");
  const cooldown_secs = safeNumber(r.i64(), "cooldown_secs");
  const last_tx_ts = safeNumber(r.i64(), "last_tx_ts");
  const is_frozen = r.bool();
  const n = r.u32();
  if (n > MAX_ALLOWLIST) throw new RangeError("allowlist length out of range");
  const allowlist = Array.from({ length: n }, () => r.pubkey().toBase58());
  const last_evidence_hash = toHex(r.bytes(32));
  const tx_count = safeNumber(r.u64(), "tx_count");
  const bump = r.u8();
  const funds_bump = r.u8();
  return {
    owner,
    agent_delegate,
    max_per_tx_lamports,
    daily_cap_lamports,
    daily_spent_lamports,
    window_start_ts,
    cooldown_secs,
    last_tx_ts,
    is_frozen,
    allowlist,
    last_evidence_hash,
    tx_count,
    bump,
    funds_bump,
  };
}

export interface ExecutionAuditedEvent {
  vault: string;
  recipient: string;
  amount_lamports: number;
  evidence_hash: string;
  daily_spent_lamports: number;
  tx_count: number;
  ts: number;
}

export function decodeExecutionAudited(data: Uint8Array): ExecutionAuditedEvent | null {
  if (!startsWith(data, EXECUTION_AUDITED_DISCRIMINATOR)) return null;
  const r = new Reader(data);
  r.bytes(8);
  return {
    vault: r.pubkey().toBase58(),
    recipient: r.pubkey().toBase58(),
    amount_lamports: safeNumber(r.u64(), "amount"),
    evidence_hash: toHex(r.bytes(32)),
    daily_spent_lamports: safeNumber(r.u64(), "daily_spent"),
    tx_count: safeNumber(r.u64(), "tx_count"),
    ts: safeNumber(r.i64(), "ts"),
  };
}

/** Finds ExecutionAudited in a tx's log lines (`Program data: <base64>`, emitted by emit!). */
export function findExecutionAudited(logs: readonly string[]): ExecutionAuditedEvent | null {
  for (const line of logs) {
    const m = /^Program data: (.+)$/.exec(line);
    if (!m) continue;
    const ev = decodeExecutionAudited(Buffer.from(m[1]!, "base64"));
    if (ev) return ev;
  }
  return null;
}

// ---------- Errors ----------

export interface ParsedPolicyError {
  name: PolicyErrorName;
  number: number;
}

/**
 * Extracts a PolicyError from a failed tx: first from `meta.err`
 * (`{ InstructionError: [i, { Custom: n }] }`), then from Anchor's log line
 * `Error Code: <Name>. Error Number: <n>.`
 */
export function parsePolicyError(err: unknown, logs: readonly string[] = []): ParsedPolicyError | null {
  const custom = (err as { InstructionError?: [number, { Custom?: number }] } | null)?.InstructionError?.[1]?.Custom;
  if (typeof custom === "number") {
    const name = policyErrorName(custom);
    if (name) return { name, number: custom };
  }
  for (const line of logs) {
    const m = /Error Number: (\d+)/.exec(line);
    if (!m) continue;
    const n = Number(m[1]);
    const name = n >= POLICY_ERROR_OFFSET ? policyErrorName(n) : null;
    if (name) return { name, number: n };
  }
  return null;
}
