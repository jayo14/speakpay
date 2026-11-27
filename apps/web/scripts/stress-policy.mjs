// Block 5 stress test (MILESTONES.md 14:00–16:00): exercises every on-chain policy rule on Devnet
// through the deployed API. Fully real: a fresh burner owner signs owner txs locally; the agent
// delegate (server) sends payments via /api/simulate-rogue (deployment needs ROGUE_SIM_ENABLED=true).
//
// Usage (from repo root):
//   FUNDER_KEYPAIR=~/.config/solana/speakpay/deployer.json pnpm stress:policy https://<deployment>
// Optional: SOLANA_RPC_URL (default https://api.devnet.solana.com). Costs ~0.3 SOL float (returned) + fees.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const base = (process.argv[2] ?? "").replace(/\/$/, "");
const funderPath = (process.env.FUNDER_KEYPAIR ?? "").replace(/^~/, homedir());
if (!/^https?:\/\//.test(base) || !funderPath) {
  console.error("usage: FUNDER_KEYPAIR=<path to funded devnet keypair> pnpm stress:policy <deployment URL>");
  process.exit(2);
}

const conn = new Connection(process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
const funder = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(funderPath, "utf8"))));
const owner = Keypair.generate(); // fresh vault + fresh daily window every run
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const explorer = (sig) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
const sol = (l) => `${l / LAMPORTS_PER_SOL} SOL`;

// Test policy: small numbers so every rule triggers within ~30 s.
const POLICY = { max_per_tx_lamports: 20_000_000, daily_cap_lamports: 30_000_000, cooldown_secs: 5, allowlist: [] };
const COOLDOWN_WAIT_MS = (POLICY.cooldown_secs + 2) * 1000;

async function api(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json)}`);
  return json;
}

/** Owner action exactly like the apps: server builds → owner signs → send → confirm → sync. */
async function ownerAction(action, params) {
  const built = await api("POST", "/api/tx/owner", { action, owner_pubkey: owner.publicKey.toBase58(), params });
  const tx = VersionedTransaction.deserialize(Buffer.from(built.transaction_base64, "base64"));
  tx.sign([owner]);
  const sig = await conn.sendRawTransaction(tx.serialize());
  const { value } = await conn.confirmTransaction(
    { signature: sig, blockhash: built.recent_blockhash, lastValidBlockHeight: built.last_valid_block_height },
    "confirmed",
  );
  if (value.err) throw new Error(`${action} failed on-chain: ${JSON.stringify(value.err)} ${explorer(sig)}`);
  const synced = await api("POST", "/api/vault/sync", { owner_pubkey: owner.publicKey.toBase58(), tx_signature: sig });
  console.log(`  owner ${action} ✓ ${explorer(sig)}`);
  return synced.vault;
}

const results = [];
async function expectPay(name, vaultPda, lamports, expected) {
  const r = await api("POST", "/api/simulate-rogue", { vault_pda: vaultPda, amount_lamports: lamports, client: "api" });
  const got = r.status === "PASSED" ? "PASSED" : r.error_code;
  const ok = got === expected;
  results.push({ name, ok, expected, got, sig: r.tx_signature });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: pay ${sol(lamports)} → ${got} (expected ${expected})${r.tx_signature ? ` ${explorer(r.tx_signature)}` : ""}`);
}

async function vaultState() {
  return api("GET", `/api/vault/${owner.publicKey.toBase58()}`);
}

let vaultPda = null;
try {
  console.log(`Burner owner: ${owner.publicKey.toBase58()}`);
  console.log(`Funding ${sol(0.3 * LAMPORTS_PER_SOL)} from ${funder.publicKey.toBase58()}…`);
  await sendAndConfirmTransaction(
    conn,
    new Transaction().add(SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: owner.publicKey, lamports: 0.3 * LAMPORTS_PER_SOL })),
    [funder],
  );

  console.log("Setup:");
  const v = await ownerAction("init", POLICY);
  vaultPda = v.vault_pda;
  await ownerAction("deposit", { amount_lamports: 100_000_000 });
  console.log(`  vault ${vaultPda}\n`);

  await expectPay("compliant payment", vaultPda, 10_000_000, "PASSED");
  await expectPay("second payment inside cooldown", vaultPda, 10_000_000, "CooldownActive");
  await sleep(COOLDOWN_WAIT_MS);
  await expectPay("payment after cooldown", vaultPda, 10_000_000, "PASSED");
  await sleep(COOLDOWN_WAIT_MS);
  await expectPay("payment over remaining daily cap (0.02 spent + 0.02 > 0.03)", vaultPda, 20_000_000, "ExceedsDailyCap");
  await expectPay("payment over max per tx", vaultPda, 25_000_000, "ExceedsMaxPerTx");

  await ownerAction("toggle_freeze", { frozen: true });
  await expectPay("compliant payment while frozen", vaultPda, 5_000_000, "VaultFrozen");

  await ownerAction("withdraw_all", {});
  const drained = await vaultState();
  const drainedOk = drained.vault_funds_lamports === 0;
  results.push({ name: "withdraw_all while frozen drains to 0", ok: drainedOk, expected: 0, got: drained.vault_funds_lamports });
  console.log(`${drainedOk ? "PASS" : "FAIL"}  withdraw_all while frozen → vault funds ${sol(drained.vault_funds_lamports)}`);

  await ownerAction("toggle_freeze", { frozen: false });
  await ownerAction("deposit", { amount_lamports: 50_000_000 });
  await ownerAction("update_policy", {
    ...POLICY,
    allowlist: [Keypair.generate().publicKey.toBase58()],
    agent_delegate: drained.vault.agent_delegate,
  });
  await expectPay("recipient not on allowlist", vaultPda, 5_000_000, "RecipientNotAllowlisted");
} catch (e) {
  results.push({ name: "script error", ok: false, expected: "no error", got: e instanceof Error ? e.message : String(e) });
  console.error(`ERROR  ${e instanceof Error ? e.message : e}`);
} finally {
  // Return funds: vault → owner → funder.
  try {
    if (vaultPda && (await vaultState()).vault_funds_lamports > 0) await ownerAction("withdraw_all", {});
    const bal = await conn.getBalance(owner.publicKey);
    if (bal > 10_000) {
      await sendAndConfirmTransaction(
        conn,
        new Transaction().add(SystemProgram.transfer({ fromPubkey: owner.publicKey, toPubkey: funder.publicKey, lamports: bal - 5_000 })),
        [owner],
      );
      console.log(`\nReturned ${sol(bal - 5_000)} to funder (vault rent stays locked in the PolicyVault account).`);
    }
  } catch (e) {
    console.error(`cleanup failed: ${e instanceof Error ? e.message : e}`);
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
