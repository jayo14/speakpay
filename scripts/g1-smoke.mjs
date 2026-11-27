// G1 smoke test against a live deployment (MILESTONES.md Block 3). Read-only: no payments.
// Usage: pnpm g1:smoke https://speakpay.vercel.app
const base = (process.argv[2] ?? "").replace(/\/$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("usage: pnpm g1:smoke <deployment URL>");
  process.exit(2);
}

const results = [];
const check = async (name, fn) => {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
  } catch (e) {
    results.push({ name, ok: false, detail: e instanceof Error ? e.message : String(e) });
  }
};
const get = (path, init) => fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(20_000), ...init });

await check("/api/health is ok (env, RPC, program deployed, delegate funded)", async () => {
  const r = await get("/api/health");
  const h = await r.json();
  if (!h.ok) throw new Error(JSON.stringify(h));
  if (h.delegate_balance_lamports < 50_000_000) throw new Error(`agent delegate has only ${h.delegate_balance_lamports} lamports (< 0.05 SOL)`);
  return `delegate ${h.delegate_balance_lamports / 1e9} SOL`;
});

await check("/ redirects to /dashboard (no landing page)", async () => {
  const r = await get("/");
  const loc = r.headers.get("location") ?? "";
  if (r.status < 300 || r.status >= 400 || !loc.endsWith("/dashboard")) throw new Error(`${r.status} -> ${loc}`);
  return `${r.status} -> /dashboard`;
});

await check("/dashboard and read-only ?vault= load", async () => {
  for (const p of ["/dashboard", "/dashboard?vault=11111111111111111111111111111111"]) {
    const r = await get(p);
    if (r.status !== 200) throw new Error(`${p} -> ${r.status}`);
  }
  return "200";
});

await check("/merchants/clean serves price + wallet as plain text", async () => {
  const r = await get("/merchants/clean");
  const html = await r.text();
  if (r.status !== 200) throw new Error(`status ${r.status}`);
  if (!html.includes("0.02 SOL / month")) throw new Error("price text missing");
  const wallet = /Pay to \(Solana wallet\): <\/?[^>]*>?([1-9A-HJ-NP-Za-km-z]{32,44})/.exec(html)?.[1];
  if (!wallet) throw new Error("wallet missing");
  return `wallet ${wallet}`;
});

await check("API validation returns the PRD error envelope", async () => {
  const r = await get("/api/tx/owner", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  const b = await r.json();
  if (r.status !== 400 || b?.error?.code !== "BAD_REQUEST") throw new Error(`${r.status} ${JSON.stringify(b)}`);
  return "400 BAD_REQUEST";
});

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} check(s) failed` : "\nAll automated G1 checks passed. Now run the on-device and browser flows (MILESTONES.md G1).");
process.exit(failed ? 1 : 0);
