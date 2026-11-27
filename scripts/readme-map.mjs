// Regenerates the README "Judge & Sponsor Verification Map" from the code itself (MILESTONES.md §4).
// Every reference is a GitHub permalink pinned to a commit, so links never drift.
// Fails (exit 1) if any anchor is missing, so the map can't silently go stale.
//
//   node scripts/readme-map.mjs            # pin to HEAD (commit first!)
//   node scripts/readme-map.mjs <sha>      # pin to a specific commit
//
// Live proof cells come from docs/live-proofs.json (real Devnet signatures you recorded):
//   { "deploy_tx": "...", "passed_tx": "...", "rogue_max_tx": "...", "rogue_frozen_tx": "...",
//     "freeze_tx": "...", "verify_run_id": "...", "app_url": "https://...", "apk_url": "...", "video_url": "..." }
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sh = (cmd) => execSync(cmd, { cwd: root, encoding: "utf8" }).trim();

const sha = process.argv[2] ?? sh("git rev-parse HEAD");
const remote = sh("git remote get-url origin");
const slug = /github\.com[/:]([^/]+\/[^/.]+)/.exec(remote)?.[1] ?? /\/git\/([^/]+\/[^/.]+)/.exec(remote)?.[1];
if (!slug) throw new Error(`cannot derive GitHub owner/repo from remote ${remote}`);
const repoUrl = `https://github.com/${slug}`;

const lines = (file) => readFileSync(join(root, file), "utf8").split("\n");
const missing = [];

/** One line matching `re`, or a range from it to the end of its block when `block` is set. */
function ref(file, re, { block = false, label } = {}) {
  const ls = lines(file);
  const start = ls.findIndex((l) => re.test(l));
  if (start < 0) {
    missing.push(`${file}: ${re}`);
    return "`missing`";
  }
  let end = start;
  if (block) {
    // Brace-balanced end of the item that starts on `start`.
    let depth = 0;
    let opened = false;
    for (let i = start; i < ls.length; i++) {
      for (const ch of ls[i]) {
        if (ch === "{") (depth++, (opened = true));
        else if (ch === "}") depth--;
      }
      if (opened && depth <= 0) {
        end = i;
        break;
      }
    }
  }
  const anchor = end > start ? `L${start + 1}-L${end + 1}` : `L${start + 1}`;
  const text = label ?? `${file.split("/").pop()}#${anchor}`;
  return `[\`${text}\`](${repoUrl}/blob/${sha}/${file}#${anchor})`;
}

const programId = /policy_vault = "([1-9A-HJ-NP-Za-km-z]+)"/.exec(readFileSync(join(root, "Anchor.toml"), "utf8"))?.[1];
const proofsPath = join(root, "docs/live-proofs.json");
// Empty strings count as "not recorded yet" (copy docs/live-proofs.example.json to start).
const proofs = Object.fromEntries(
  Object.entries(existsSync(proofsPath) ? JSON.parse(readFileSync(proofsPath, "utf8")) : {}).filter(([, v]) => v),
);
const tx = (key, text) => (proofs[key] ? `[${text}](https://explorer.solana.com/tx/${proofs[key]}?cluster=devnet)` : `_${text}: pending_`);
const link = (key, text) => (proofs[key] ? `[${text}](${proofs[key]})` : `_${text}: pending_`);

const L = "programs/policy-vault/src";
const W = "apps/web";
const M = "apps/mobile";

const rows = [
  [
    "**Solana — Anchor program**",
    "6 instructions on two PDAs; ordered policy checks; custom `PolicyError`",
    [
      ref(`${L}/lib.rs`, /pub fn execute_guarded_transfer/, { block: true, label: "execute_guarded_transfer" }),
      ref(`${L}/policy.rs`, /pub fn check_transfer/, { block: true, label: "check order (§4.3)" }),
      ref(`${L}/errors.rs`, /pub enum PolicyError/, { block: true, label: "PolicyError 6000–6009" }),
      ref(`${L}/state.rs`, /pub struct PolicyVault/, { block: true, label: "PolicyVault PDA" }),
    ].join("<br>"),
    [tx("deploy_tx", "deploy"), tx("passed_tx", "PASSED payment"), tx("rogue_max_tx", "rogue → ExceedsMaxPerTx"), tx("rogue_frozen_tx", "frozen → VaultFrozen")].join("<br>"),
  ],
  [
    "**Solana — tests**",
    "check order, every error code, PDA seeds, byte-level codec vectors",
    [
      ref(`${L}/policy.rs`, /mod tests/, { label: "policy tests" }),
      ref(`${L}/lib.rs`, /mod codec_vectors/, { label: "codec vectors" }),
      ref("packages/shared/test/codec.test.ts", /byte-for-byte/, { label: "TS ↔ Rust bytes" }),
    ].join("<br>"),
    "CI: `pnpm test:program:host`, `pnpm test`",
  ],
  [
    "**Solana Mobile — MWA**",
    "Native Expo dev-build APK; owner txs signed with MWA",
    [
      ref(`${M}/components/app-providers.tsx`, /<MobileWalletProvider/, { label: "MobileWalletProvider" }),
      ref(`${M}/features/vault/use-vault.ts`, /signAndSendTransactions\(tx/, { label: "signAndSendTransactions" }),
    ].join("<br>"),
    link("apk_url", "APK release"),
  ],
  [
    "**Firecrawl**",
    "`POST /v2/scrape`, top-level `checkPromptInjection: true`, JSON schema, 403 halts the run",
    [
      ref(`${W}/lib/firecrawl.ts`, /checkPromptInjection: true/, { label: "request body" }),
      ref(`${W}/lib/firecrawl.ts`, /export function classifyScrape/, { block: true, label: "403 classification" }),
      ref(`${W}/app/api/voice-command/route.ts`, /scrape\.kind === "injection"/, { block: true, label: "halt before signing" }),
      ref(`${W}/app/merchants/shady/page.tsx`, /shadyInjectionText\(attacker\)/, { label: "injected fixture" }),
    ].join("<br>"),
    "`pnpm firecrawl:check` log → `docs/firecrawl-403.txt`",
  ],
  [
    "**ElevenLabs STT**",
    "Scribe (`scribe_v3`) with crypto keyterms",
    [ref(`${W}/lib/elevenlabs.ts`, /export async function transcribe/, { block: true, label: "transcribe()" })].join("<br>"),
    "transcript on every audit row",
  ],
  [
    "**ElevenLabs TTS**",
    "`eleven_flash_v2_5`, base64 MP3 in the API response",
    [ref(`${W}/lib/elevenlabs.ts`, /export async function speak/, { block: true, label: "speak()" })].join("<br>"),
    link("video_url", "demo video"),
  ],
  [
    "**Supabase**",
    "Schema + RLS; Realtime feed on phone and web",
    [
      ref("supabase/migrations/001_init.sql", /create table public\.audit_runs/, { label: "audit_runs" }),
      ref("supabase/migrations/001_init.sql", /supabase_realtime add table public\.audit_runs/, { label: "Realtime" }),
      ref(`${M}/features/feed/use-audit-feed.ts`, /'postgres_changes'/, { label: "mobile subscription" }),
      ref(`${W}/app/dashboard/_components/audit-feed.tsx`, /"postgres_changes"/, { label: "web subscription" }),
      ref(`${W}/lib/audit.ts`, /export async function insertAuditRun/, { block: true, label: "server insert" }),
    ].join("<br>"),
    link("app_url", "live dashboard"),
  ],
  [
    "**Evidence hash**",
    "SHA-256(transcript + scraped JSON + payment) → on-chain event → recomputable receipt",
    [
      ref("packages/shared/src/evidence.ts", /export function evidencePreimage/, { block: true, label: "preimage" }),
      ref(`${L}/events.rs`, /pub struct ExecutionAudited/, { block: true, label: "ExecutionAudited" }),
      ref(`${W}/lib/verify.ts`, /export function evidenceMatches/, { block: true, label: "verify" }),
    ].join("<br>"),
    proofs.verify_run_id && proofs.app_url
      ? `[/api/audit/verify](${proofs.app_url}/api/audit/verify/${proofs.verify_run_id}) → \`match: true\``
      : "_verify link: pending_",
  ],
  [
    "**Rogue-agent proof**",
    "Delegate signs directly, preflight skipped so the validator records the rejection",
    [ref(`${W}/app/api/simulate-rogue/route.ts`, /skipPreflight: true/, { label: "simulate-rogue" })].join("<br>"),
    tx("rogue_max_tx", "failed tx 0x1771"),
  ],
  [
    "**Voice kill switch**",
    "Owner-signed `toggle_freeze`, verified on-chain before it is logged",
    [
      ref(`${L}/lib.rs`, /pub fn toggle_freeze/, { block: true, label: "toggle_freeze" }),
      ref(`${W}/app/api/audit/freeze/route.ts`, /export async function POST/, { block: true, label: "audit/freeze" }),
    ].join("<br>"),
    tx("freeze_tx", "freeze tx"),
  ],
];

if (missing.length) {
  console.error(`Anchors not found (update scripts/readme-map.mjs):\n  ${missing.join("\n  ")}`);
  process.exit(1);
}

const table = [
  `Pinned to commit [\`${sha.slice(0, 7)}\`](${repoUrl}/tree/${sha}). Regenerate with \`pnpm readme:map\`.`,
  "",
  `**Program (Devnet):** \`${programId ?? "unknown"}\` — [Explorer](https://explorer.solana.com/address/${programId}?cluster=devnet)`,
  "",
  "| Integration | What to check | Code (permalinks) | Live proof |",
  "|---|---|---|---|",
  ...rows.map((r) => `| ${r.join(" | ")} |`),
].join("\n");

const readmePath = join(root, "README.md");
const readme = readFileSync(readmePath, "utf8");
const START = "<!-- verification-map:start -->";
const END = "<!-- verification-map:end -->";
if (!readme.includes(START) || !readme.includes(END)) throw new Error("README.md is missing the verification-map markers");
const next = readme.replace(new RegExp(`${START}[\\s\\S]*?${END}`), `${START}\n${table}\n${END}`);
writeFileSync(readmePath, next);
console.log(`README verification map updated (${rows.length} rows, pinned to ${sha.slice(0, 7)}).`);
