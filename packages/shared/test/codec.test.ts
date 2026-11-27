import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PublicKey, SystemProgram } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import {
  EXECUTION_AUDITED_DISCRIMINATOR,
  IX_DISCRIMINATORS,
  POLICY_VAULT_DISCRIMINATOR,
  POLICY_VAULT_SPACE,
  decodeExecutionAudited,
  decodePolicyVault,
  encode,
  findExecutionAudited,
  ix,
  parsePolicyError,
} from "../src/codec";

// Produced by `codec_vectors` in programs/policy-vault/src/lib.rs (same inputs as below).
const vectors = JSON.parse(readFileSync(new URL("./vectors/program.json", import.meta.url), "utf8")) as {
  instructions: Record<string, string>;
  policy_vault_account: string;
  policy_vault_space: number;
  execution_audited_event: string;
};

const k = (n: number) => new PublicKey(new Uint8Array(32).fill(n));
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const sha8 = (s: string) => [...createHash("sha256").update(s).digest().subarray(0, 8)];

describe("discriminators", () => {
  it("equal sha256 prefixes Anchor uses", () => {
    for (const [name, disc] of Object.entries(IX_DISCRIMINATORS)) {
      expect([...disc], name).toEqual(sha8(`global:${name}`));
    }
    expect([...POLICY_VAULT_DISCRIMINATOR]).toEqual(sha8("account:PolicyVault"));
    expect([...EXECUTION_AUDITED_DISCRIMINATOR]).toEqual(sha8("event:ExecutionAudited"));
  });
});

describe("instruction data matches the Rust program byte-for-byte", () => {
  it("init_policy_vault", () => {
    const data = encode.initPolicyVault(k(1), {
      maxPerTxLamports: 50_000_000,
      dailyCapLamports: 150_000_000,
      cooldownSecs: 30,
      allowlist: [k(2), k(3)],
    });
    expect(hex(data)).toBe(vectors.instructions.init_policy_vault);
  });
  it("deposit", () => expect(hex(encode.deposit(200_000_000))).toBe(vectors.instructions.deposit));
  it("update_policy", () => {
    const data = encode.updatePolicy({ maxPerTxLamports: 1, dailyCapLamports: 2, cooldownSecs: 0, allowlist: [] }, k(4));
    expect(hex(data)).toBe(vectors.instructions.update_policy);
  });
  it("execute_guarded_transfer", () => {
    const data = encode.executeGuardedTransfer(20_000_000, new Uint8Array(32).fill(0xab));
    expect(hex(data)).toBe(vectors.instructions.execute_guarded_transfer);
  });
  it("toggle_freeze", () => expect(hex(encode.toggleFreeze(true))).toBe(vectors.instructions.toggle_freeze));
  it("withdraw_all", () => expect(hex(encode.withdrawAll())).toBe(vectors.instructions.withdraw_all));

  it("rejects invalid inputs before they reach the chain", () => {
    expect(() => encode.deposit(-1)).toThrow(RangeError);
    expect(() => encode.executeGuardedTransfer(1, new Uint8Array(31))).toThrow(RangeError);
    const six = [1, 2, 3, 4, 5, 6].map(k);
    expect(() =>
      encode.initPolicyVault(k(1), { maxPerTxLamports: 1, dailyCapLamports: 1, cooldownSecs: 0, allowlist: six }),
    ).toThrow(RangeError);
  });
});

describe("account metas follow lib.rs Accounts order", () => {
  const a = { programId: k(9), owner: k(5), policyVault: k(6), vaultFunds: k(7) };
  const metas = (i: { keys: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[] }) =>
    i.keys.map((m) => [m.pubkey.toBase58(), m.isSigner, m.isWritable]);

  it("execute_guarded_transfer: delegate signs + pays, recipient writable", () => {
    const i = ix.executeGuardedTransfer(
      { programId: a.programId, policyVault: a.policyVault, vaultFunds: a.vaultFunds, agentDelegate: k(1), recipient: k(2) },
      1,
      new Uint8Array(32),
    );
    expect(metas(i)).toEqual([
      [k(1).toBase58(), true, true],
      [k(6).toBase58(), false, true],
      [k(7).toBase58(), false, true],
      [k(2).toBase58(), false, true],
      [SystemProgram.programId.toBase58(), false, false],
    ]);
  });

  it("owner instructions are signed by the owner only", () => {
    for (const i of [
      ix.initPolicyVault(a, k(1), { maxPerTxLamports: 1, dailyCapLamports: 1, cooldownSecs: 0, allowlist: [] }),
      ix.deposit(a, 1),
      ix.toggleFreeze(a, true),
      ix.withdrawAll(a),
    ]) {
      const signers = i.keys.filter((m) => m.isSigner).map((m) => m.pubkey.toBase58());
      expect(signers).toEqual([k(5).toBase58()]);
    }
  });
});

describe("decoding", () => {
  it("decodes the PolicyVault account serialized by Anchor", () => {
    expect(vectors.policy_vault_space).toBe(POLICY_VAULT_SPACE);
    const v = decodePolicyVault(Buffer.from(vectors.policy_vault_account, "hex"));
    expect(v).toEqual({
      owner: k(5).toBase58(),
      agent_delegate: k(1).toBase58(),
      max_per_tx_lamports: 50_000_000,
      daily_cap_lamports: 150_000_000,
      daily_spent_lamports: 20_000_000,
      window_start_ts: 1_800_000_000,
      cooldown_secs: 30,
      last_tx_ts: 1_800_000_100,
      is_frozen: true,
      allowlist: [k(2).toBase58()],
      last_evidence_hash: "cd".repeat(32),
      tx_count: 7,
      bump: 254,
      funds_bump: 253,
    });
  });

  it("rejects other account types", () => {
    expect(() => decodePolicyVault(new Uint8Array(327))).toThrow(TypeError);
  });

  it("decodes ExecutionAudited from emit! log lines", () => {
    const b64 = Buffer.from(vectors.execution_audited_event, "hex").toString("base64");
    const ev = findExecutionAudited(["Program log: Instruction: ExecuteGuardedTransfer", `Program data: ${b64}`]);
    expect(ev).toEqual({
      vault: k(6).toBase58(),
      recipient: k(2).toBase58(),
      amount_lamports: 20_000_000,
      evidence_hash: "ab".repeat(32),
      daily_spent_lamports: 20_000_000,
      tx_count: 1,
      ts: 1_800_000_200,
    });
    expect(decodeExecutionAudited(new Uint8Array(8))).toBeNull();
  });
});

describe("parsePolicyError", () => {
  it("reads Custom codes from meta.err", () => {
    expect(parsePolicyError({ InstructionError: [0, { Custom: 6001 }] })).toEqual({ name: "ExceedsMaxPerTx", number: 6001 });
    expect(parsePolicyError({ InstructionError: [0, { Custom: 6000 }] })).toEqual({ name: "VaultFrozen", number: 6000 });
  });
  it("falls back to Anchor log lines", () => {
    const logs = ["Program log: AnchorError occurred. Error Code: CooldownActive. Error Number: 6003. Error Message: Cooldown period has not elapsed."];
    expect(parsePolicyError(null, logs)).toEqual({ name: "CooldownActive", number: 6003 });
  });
  it("ignores non-policy errors", () => {
    expect(parsePolicyError({ InstructionError: [0, { Custom: 1 }] })).toBeNull();
    expect(parsePolicyError("BlockhashNotFound", ["Error Number: 2006."])).toBeNull();
  });
});
