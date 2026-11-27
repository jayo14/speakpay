// Generates the architecture diagram from ONE definition into three formats (MILESTONES.md Block 6):
//   docs/architecture.excalidraw  — open/edit at excalidraw.com (File → Open)
//   docs/architecture.svg         — vector
//   docs/architecture.png         — README image (rendered with Playwright Chromium, if installed)
// Usage: node scripts/gen-architecture.mjs
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1680;
const H = 1060;
const INK = "#0a0a0a";
const MUTED = "#6b6b6b";
const LINE = "#bdbdbd";
const RED = "#c21807";

// ---------- Diagram definition (PRD §3.1) ----------
// Box: { x, y, w, h, title, lines, strong?, mono? }  (lines starting "!" are red)
const boxes = [
  { x: 40, y: 140, w: 380, h: 240, title: "ANDROID PHONE — Expo dev-build APK", lines: ["Vault · Console · Feed tabs", "hold-to-talk recording (expo-audio)", "spoken verdict playback", "live audit feed (Realtime)", "demo-readiness checklist"] },
  { x: 40, y: 470, w: 380, h: 160, title: "OWNER WALLET — Phantom / Solflare", lines: ["Mobile Wallet Adapter (Android)", "Wallet Adapter (web dashboard)", "only key that can: create · deposit ·", "change policy · freeze · withdraw"] },
  { x: 40, y: 720, w: 380, h: 140, title: "WEB COMPANION — /dashboard", lines: ["same API, program and feed", "browser voice console", "read-only ?vault= second screen"] },
  {
    x: 520, y: 140, w: 520, h: 530, title: "VERCEL — Next.js API (apps/web)", mono: true,
    lines: [
      "POST /api/voice-command",
      "1  ElevenLabs STT (Scribe)",
      "2  intent grammar — transcript only",
      "3  Firecrawl /v2/scrape",
      "   + checkPromptInjection: true",
      "!   403 → INJECTION_BLOCKED · STOP",
      "4  off-chain prechecks (convenience)",
      "5  evidence_hash = SHA-256(preimage)",
      "6  agent_delegate signs",
      "   execute_guarded_transfer",
      "7  audit row → Supabase",
      "8  ElevenLabs TTS verdict",
      "",
      "/api/tx/owner   /api/vault/*",
      "/api/simulate-rogue   /api/audit/*",
    ],
  },
  { x: 520, y: 770, w: 520, h: 110, title: "MERCHANT FIXTURES — same deployment", mono: true, lines: ["/merchants/clean   honest 0.02 SOL plan", "/merchants/shady   hidden injection payload"] },
  { x: 1180, y: 140, w: 460, h: 110, title: "ELEVENLABS", lines: ["STT scribe_v3 + crypto keyterms", "TTS eleven_flash_v2_5 → base64 MP3"] },
  { x: 1180, y: 280, w: 460, h: 110, title: "FIRECRAWL", lines: ["/v2/scrape · JSON schema extraction", "prompt-injection guard → HTTP 403"] },
  {
    x: 1180, y: 420, w: 460, h: 250, title: "SOLANA DEVNET — policy_vault (Anchor)", strong: true, mono: true,
    lines: [
      "PolicyVault PDA [policy_vault, owner]",
      "VaultFunds  PDA [vault_funds, vault]",
      "",
      "checks, in order:",
      "frozen → max/tx → daily cap →",
      "cooldown → allowlist → balance",
      "",
      "emits ExecutionAudited(evidence_hash)",
    ],
  },
  { x: 1180, y: 700, w: 460, h: 160, title: "SUPABASE", lines: ["Postgres: vault_profiles · audit_runs", "RLS: public read · service-role writes", "Realtime → phone + web feeds", "receipt preimage → recomputable hash"] },
];

// Arrow: { pts: [[x,y],...], label?, at?: [x,y], red?, dashed?, both? }
const arrows = [
  { pts: [[420, 215], [520, 215]], label: "voice", at: [440, 205] },
  { pts: [[520, 265], [420, 265]], label: "verdict + TTS", at: [428, 290] },
  { pts: [[230, 380], [230, 470]], label: "owner tx to sign", at: [240, 430] },
  // One vertical lane per connector in the 1040–1180 gap: audit 1060 · MWA 1090 · fetch 1160.
  { pts: [[420, 600], [480, 600], [480, 715], [1090, 715], [1090, 560], [1180, 560]], label: "MWA signAndSendTransactions (owner)", at: [600, 707] },
  { pts: [[1040, 195], [1180, 195]], label: "STT / TTS", at: [1048, 185] },
  { pts: [[1040, 320], [1180, 320]], label: "scrape URL", at: [1048, 310] },
  { pts: [[1180, 360], [1040, 360]], label: "403 injection", at: [1048, 350], red: true, dashed: true },
  { pts: [[1180, 380], [1160, 380], [1160, 825], [1040, 825]], label: "fetch page", at: [1048, 845] },
  { pts: [[1040, 520], [1180, 520]], label: "delegate tx", at: [1048, 510] },
  { pts: [[1040, 650], [1060, 650], [1060, 760], [1180, 760]], label: "audit row", at: [1066, 752] },
  { pts: [[1410, 860], [1410, 960], [230, 960], [230, 860]], label: "Realtime INSERTs → live feed (phone + web)", at: [560, 952] },
];

const texts = [
  { x: 40, y: 48, size: 34, bold: true, text: "SpeakPay — architecture" },
  { x: 40, y: 84, size: 16, color: MUTED, text: "Voice goal → verified live web evidence → payment enforced by the Solana validator · Devnet" },
  { x: 40, y: 1010, size: 14, color: MUTED, text: "Threat model: assume the API, the LLM and the agent key are compromised — max loss = min(max_per_tx, daily cap left) per cooldown, only to allowlisted wallets, 0 once frozen." },
];

// ---------- SVG ----------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const SANS = "Inter, Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', Menlo, Consolas, monospace";

function svg() {
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  out.push(`<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${INK}"/></marker><marker id="r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${RED}"/></marker></defs>`);
  out.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
  for (const b of boxes) {
    out.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#fff" stroke="${b.strong ? INK : LINE}" stroke-width="${b.strong ? 3 : 1.5}"/>`);
    out.push(`<text x="${b.x + 18}" y="${b.y + 32}" font-family="${SANS}" font-size="14" font-weight="700" letter-spacing="1" fill="${INK}">${esc(b.title)}</text>`);
    b.lines.forEach((l, i) => {
      const red = l.startsWith("!");
      out.push(`<text x="${b.x + 18}" y="${b.y + 64 + i * 24}" font-family="${b.mono ? MONO : SANS}" font-size="${b.mono ? 14 : 15}" fill="${red ? RED : INK}" xml:space="preserve">${esc(red ? l.slice(1) : l)}</text>`);
    });
  }
  for (const a of arrows) {
    const c = a.red ? RED : INK;
    out.push(`<polyline points="${a.pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${c}" stroke-width="1.5" ${a.dashed ? 'stroke-dasharray="6 5"' : ""} marker-end="url(#${a.red ? "r" : "a"})"/>`);
    if (a.label) out.push(`<text x="${a.at[0]}" y="${a.at[1]}" font-family="${SANS}" font-size="12" fill="${a.red ? RED : MUTED}">${esc(a.label)}</text>`);
  }
  for (const t of texts) {
    out.push(`<text x="${t.x}" y="${t.y}" font-family="${SANS}" font-size="${t.size}" font-weight="${t.bold ? 800 : 400}" fill="${t.color ?? INK}">${esc(t.text)}</text>`);
  }
  out.push("</svg>");
  return out.join("\n");
}

// ---------- Excalidraw ----------
let seed = 1;
const base = (o) => ({
  id: `el-${seed}`,
  angle: 0,
  strokeColor: INK,
  backgroundColor: "transparent",
  fillStyle: "solid",
  strokeWidth: 1,
  strokeStyle: "solid",
  roughness: 0,
  opacity: 100,
  groupIds: [],
  frameId: null,
  roundness: null,
  seed: seed,
  version: 1,
  versionNonce: seed++,
  isDeleted: false,
  boundElements: null,
  updated: 1764201600000,
  link: null,
  locked: false,
  ...o,
});
const exText = (x, y, text, { size = 16, color = INK, mono = false } = {}) => {
  const lines = text.split("\n");
  return base({
    type: "text",
    x,
    y: y - size,
    width: Math.max(...lines.map((l) => l.length)) * size * (mono ? 0.6 : 0.55),
    height: lines.length * size * 1.25,
    strokeColor: color,
    text,
    originalText: text,
    fontSize: size,
    fontFamily: mono ? 3 : 2,
    textAlign: "left",
    verticalAlign: "top",
    containerId: null,
    lineHeight: 1.25,
    autoResize: true,
  });
};

function excalidraw() {
  const els = [];
  for (const b of boxes) {
    els.push(base({ type: "rectangle", x: b.x, y: b.y, width: b.w, height: b.h, strokeColor: b.strong ? INK : LINE, strokeWidth: b.strong ? 4 : 1 }));
    els.push(exText(b.x + 18, b.y + 34, b.title, { size: 14 }));
    b.lines.forEach((l, i) => {
      if (!l) return;
      const red = l.startsWith("!");
      els.push(exText(b.x + 18, b.y + 66 + i * 24, red ? l.slice(1) : l, { size: b.mono ? 14 : 15, mono: b.mono, color: red ? RED : INK }));
    });
  }
  for (const a of arrows) {
    const [x0, y0] = a.pts[0];
    const rel = a.pts.map(([x, y]) => [x - x0, y - y0]);
    const xs = rel.map((p) => p[0]);
    const ys = rel.map((p) => p[1]);
    els.push(
      base({
        type: "arrow",
        x: x0,
        y: y0,
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
        strokeColor: a.red ? RED : INK,
        strokeStyle: a.dashed ? "dashed" : "solid",
        points: rel,
        lastCommittedPoint: null,
        startBinding: null,
        endBinding: null,
        startArrowhead: null,
        endArrowhead: "arrow",
        elbowed: false,
      }),
    );
    if (a.label) els.push(exText(a.at[0], a.at[1], a.label, { size: 12, color: a.red ? RED : MUTED }));
  }
  for (const t of texts) els.push(exText(t.x, t.y, t.text, { size: t.size, color: t.color ?? INK }));
  return { type: "excalidraw", version: 2, source: "https://github.com/jayo14/speakpay/blob/main/scripts/gen-architecture.mjs", elements: els, appState: { viewBackgroundColor: "#ffffff", gridSize: null }, files: {} };
}

// ---------- Write ----------
const svgText = svg();
writeFileSync(join(root, "docs/architecture.svg"), svgText);
writeFileSync(join(root, "docs/architecture.excalidraw"), JSON.stringify(excalidraw(), null, 2) + "\n");
console.log("wrote docs/architecture.svg and docs/architecture.excalidraw");

try {
  // createRequire honours NODE_PATH (globally installed Playwright); ESM import() does not.
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await page.setContent(`<html><body style="margin:0">${svgText}</body></html>`);
  await page.locator("svg").screenshot({ path: join(root, "docs/architecture.png") });
  await browser.close();
  console.log("wrote docs/architecture.png");
} catch (e) {
  console.warn(`PNG skipped (Playwright unavailable: ${e instanceof Error ? e.message.split("\n")[0] : e})`);
}
