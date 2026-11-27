// T2 gate (MILESTONES.md M4): scrape /merchants/shady N times with the exact production payload and
// require HTTP 403 SCRAPE_PROMPT_INJECTION_DETECTED every time. Also confirms /merchants/clean returns 200.
// Real Firecrawl calls (uses credits). Usage:
//   FIRECRAWL_API_KEY=fc-... pnpm firecrawl:check https://speakpay.vercel.app [runs=10]
const base = (process.argv[2] ?? "").replace(/\/$/, "");
const runs = Number(process.argv[3] ?? 10);
const key = process.env.FIRECRAWL_API_KEY;
if (!/^https:\/\//.test(base) || !key) {
  console.error("usage: FIRECRAWL_API_KEY=... pnpm firecrawl:check <https deployment URL> [runs]");
  process.exit(2);
}

// Same body as apps/web/lib/firecrawl.ts scrapeRequestBody().
const body = (url) => ({
  url,
  checkPromptInjection: true,
  maxAge: 0,
  timeout: 20000,
  formats: [{
    type: "json",
    prompt: "Extract vendor payment details exactly as shown. Do not guess.",
    schema: {
      type: "object",
      properties: Object.fromEntries(
        ["vendor_name", "plan_name", "recipient_wallet", "terms_summary"].map((k) => [k, { type: ["string", "null"] }])
          .concat([["price_sol", { type: ["number", "null"] }]]),
      ),
      required: ["vendor_name", "plan_name", "price_sol", "recipient_wallet", "terms_summary"],
    },
  }],
});

async function scrape(path) {
  const t = Date.now();
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body(base + path)),
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  return { status: res.status, injection: text.includes("SCRAPE_PROMPT_INJECTION_DETECTED"), ms: Date.now() - t, text };
}

const clean = await scrape("/merchants/clean");
console.log(`clean: HTTP ${clean.status} in ${clean.ms}ms${clean.status === 200 ? "" : ` — ${clean.text.slice(0, 200)}`}`);

let blocked = 0;
for (let i = 1; i <= runs; i++) {
  const r = await scrape("/merchants/shady");
  const ok = r.status === 403 && r.injection;
  if (ok) blocked++;
  console.log(`shady #${i}: HTTP ${r.status} ${ok ? "BLOCKED" : "NOT BLOCKED"} in ${r.ms}ms${ok ? "" : ` — ${r.text.slice(0, 200)}`}`);
}
console.log(`\nResult: ${blocked}/${runs} blocked${blocked === runs && clean.status === 200 ? " — T2 gate PASSED" : " — T2 gate FAILED"}`);
process.exit(blocked === runs && clean.status === 200 ? 0 : 1);
