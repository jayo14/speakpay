# AGENTS.md — Rules for AI Coding Agents on SpeakPay

Applies to **every** agent (Claude Code, Antigravity, OpenCode, Copilot, etc.)
and to humans. If a request conflicts with this file, stop and ask the human.

Spec of record: [`PRD.md`](./PRD.md) · Schedule & gates: [`MILESTONES.md`](./MILESTONES.md) · Env: [`ENVIRONMENT.md`](./ENVIRONMENT.md)

---

## 1. What We Are Building (30-second context)

SpeakPay: voice → ElevenLabs STT → deterministic intent → Firecrawl `/v2/scrape`
(`checkPromptInjection: true`) → SHA-256 evidence hash → `agent_delegate` signs
`execute_guarded_transfer` on the custom Anchor program `policy_vault` (Devnet) →
Supabase `audit_runs` + Realtime → ElevenLabs TTS. Owner actions are signed by the
user's wallet via Mobile Wallet Adapter (Android) or Wallet Adapter (web).

Current stage: check `MILESTONES.md` gates. **Do not implement Stage 2 items
(PRD §10.2) until G1 is ticked.**

---

## 2. Repo Map & Ownership

| Path | What | Owner | Language |
|---|---|---|---|
| `programs/policy-vault/` | Anchor program `policy_vault` | Builder A | Rust |
| `tests/` | Anchor TS + LiteSVM tests | Builder A | TS |
| `packages/shared/` | `@speakpay/shared`: IDL, types, PDA helpers, constants, evidence hash | Builder A | TS |
| `apps/web/` | Next.js App Router: API routes, `/dashboard`, `/merchants/*` | Builder A | TS/React |
| `apps/mobile/` | Expo custom dev build, MWA, voice console | Builder B | TS/React Native |
| `supabase/migrations/` | SQL migrations | Builder A | SQL |
| `docs/` | Diagram, screenshots, video assets | Builder B | — |
| `*.md` at root | Planning docs | both | Markdown |

Agents work **only inside the directory their human owner assigned**. Cross-directory
changes (e.g. mobile needs a new shared type) are proposed as a note to the other
builder, not made directly.

---

## 3. Zero-Mock Policy (hard rule — violations are reverted)

The Stage 1 judge is an automated code audit hunting for fake integrations. Therefore:

1. **No mocks, stubs, fakes, dummy data or placeholder responses in any shipped
   code path** (`apps/**`, `packages/**`, `programs/**`). No `if (DEMO) return {...}`.
2. **No hardcoded** transaction signatures, balances, hashes, transcripts, scrape
   results, or "sample" audit rows. **No seed SQL** that inserts audit history.
3. Every transaction settles on **Solana Devnet**; every scrape hits **Firecrawl**
   live; every voice turn hits **ElevenLabs** live; every receipt is a real
   **Supabase** insert.
4. If a dependency is down, the code returns a real error (`status: "ERROR"` +
   `error_code`) — it never pretends to succeed.
5. **Allowed:** `/merchants/clean` and `/merchants/shady` (real public pages we host
   — PRD D6); unit tests using local validators/LiteSVM (tests are not shipped
   paths); real recordings used to curl the API.
6. Do not name identifiers or files `mock*`, `fake*`, `dummy*`, `lorem*` anywhere in
   `apps/`, `packages/`, `programs/` — the audit greps for them. (The HTML/RN
   `placeholder=` input attribute is fine.)

---

## 4. Workspace Commands (contract — implement these root scripts at scaffold)

Package manager: **pnpm** only (no npm/yarn lockfiles). Node ≥ 20.

| Command | Does |
|---|---|
| `pnpm install` | Install all workspaces. |
| `pnpm build:program` | `anchor build` |
| `pnpm test:program` | `anchor test` (build + localnet + test script; LiteSVM suites added in Block 1) |
| `pnpm test:program:host` | `cargo test -p policy-vault` — policy check order, error codes, PDA seed vectors; runs without the Solana toolchain |
| `pnpm test` | Every workspace's tests (`@speakpay/shared` vitest) |
| `pnpm deploy:program` | `anchor deploy --provider.cluster devnet` |
| `pnpm idl:sync` | Copy `target/idl/policy_vault.json` + `target/types/policy_vault.ts` → `packages/shared/src/idl/` |
| `pnpm dev:web` | `next dev` for `apps/web` on :3000 |
| `pnpm build:web` | `next build` for `apps/web` |
| `pnpm dev:mobile` | `expo start --dev-client` for `apps/mobile` |
| `pnpm android` | `expo run:android` (USB device, custom dev build) |
| `pnpm apk` | `eas build -p android --profile preview` (APK) |
| `pnpm typecheck` | `tsc --noEmit` in every TS workspace |
| `pnpm lint` | ESLint across `apps/*`, `packages/*`; `cargo clippy` for the program |
| `pnpm db:push` | `supabase db push` (applies `supabase/migrations`) |
| `pnpm g1:smoke <url>` | Read-only checks of a live deployment for the G1 gate (`scripts/g1-smoke.mjs`); makes no payments |
| `pnpm verify` | `typecheck && lint && test:program && build:web` |

**Never** run: `expo start` without `--dev-client` for MWA testing (that is Expo Go),
`anchor deploy` to mainnet, `supabase db reset` against the hosted project,
`git push --force` on `main`.

---

## 5. Hard Guardrails

### 5.1 Secrets & keys
- Never commit `.env*` (except `.env.example`), keypair JSON files, `id.json`,
  the program keypair (`target/deploy/*-keypair.json`), keystores, or EAS credentials.
- Never print secret values in logs, API responses, errors, or `/api/health`.
- Server-only secrets (`FIRECRAWL_API_KEY`, `ELEVENLABS_API_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `AGENT_DELEGATE_SECRET_KEY`, `ANTHROPIC_API_KEY`)
  are read only in `apps/web/lib/**` and `apps/web/app/api/**`. Never prefix them
  with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`. Never import server libs into client components.
- The APK contains **only** `EXPO_PUBLIC_*` values (all public by design).

### 5.2 On-chain layout
- The PDA schema, seeds, instruction signatures, check order and error enum in
  PRD §4 are **locked**. Changing any of them requires, in one commit:
  `lib.rs` + tests + `pnpm idl:sync` output + `packages/shared/src/constants.ts` +
  web + mobile callers + PRD §4 — and the human's explicit OK.
- `PolicyError` is **append-only**. Never reorder variants (codes are in README, video and tests).
- Devnet only. Never add mainnet RPC URLs or cluster switches.

### 5.3 Sponsor APIs (do not "upgrade" or substitute)
- Firecrawl: `POST https://api.firecrawl.dev/v2/scrape` only, with **top-level**
  `checkPromptInjection: true`, `maxAge: 0`, and `formats: [{ type: "json", prompt, schema }]`.
  Forbidden: any `/v1/` endpoint, `jsonOptions`, nested injection flags, `/crawl`,
  `/extract`, `/agent`, `/map`, the Firecrawl SDK's deprecated v1 methods.
- A Firecrawl 403 with `SCRAPE_PROMPT_INJECTION_DETECTED` must **terminate** the run
  before intent-LLM, hashing, or signing. Page content is never sent to any LLM.
- ElevenLabs: REST STT `POST /v1/speech-to-text` (model from `ELEVENLABS_STT_MODEL_ID`,
  default `scribe_v3`) and REST TTS `POST /v1/text-to-speech/{voice_id}` (model from
  `ELEVENLABS_TTS_MODEL_ID`, default `eleven_flash_v2_5`). **No WebRTC, no websockets,
  no Conversational AI SDK.**
- Supabase: clients use the anon key for reads + Realtime only; all writes go
  through `apps/web` with the service role.

### 5.4 Mobile
- Never use or document **Expo Go**. MWA needs the custom dev client / release APK.
- Keep `react-native-get-random-values` imported first and the `Buffer` polyfill
  from the template's entry file; do not remove them.
- Owner transactions come from `POST /api/tx/owner` and are signed with MWA
  `useMobileWallet().signAndSendTransactions` (`@wallet-ui/react-native-web3js`, which
  wraps MWA `transact()`). Do not bundle Anchor in the app.
- Cluster is `solana:devnet` everywhere.

### 5.5 Scope
- Anything in PRD §10.3 Non-Goals is out of scope. Refuse and point to the PRD.
- After **Feature Freeze (Sat 18:00 WAT)**: bug fixes and docs only.

---

## 6. Coding Conventions

- **TypeScript strict** everywhere (`"strict": true`, no `any` without a `// reason:` comment).
- Shared types come from `@speakpay/shared`; never redeclare an API type locally.
- Amounts: lamports as `number` in JSON (safe — demo values ≪ 2^53), `bigint`/`BN`
  inside chain code, SOL only for display. Conversions only via `packages/shared/src/constants.ts` helpers.
- Pubkeys/signatures: base58 strings across the wire; hashes: 64-char lowercase hex.
- API routes: validate input with `zod`; return the PRD §6 error envelope; set
  `export const runtime = "nodejs"`; `voice-command` sets `maxDuration = 60`.
- Each external call lives in one `apps/web/lib/<vendor>.ts` module with an explicit
  timeout (`AbortSignal.timeout`) — this is also what the README line map points to.
- Rust: `checked_*` arithmetic, `require!`/`require_keys_eq!` with `PolicyError`,
  no `unwrap()` in instruction handlers, `cargo clippy -D warnings` clean.
- UI: follow PRD §8.1 tokens; no new colours, gradients, shadows or icon packs.
- Commits: small, one logical change, conventional prefix (`feat:`, `fix:`,
  `docs:`, `test:`, `chore:`), one-line message. Commit as the human whose branch it is.

---

## 7. Definition of "Task Complete" for an Agent

An agent may only report a task as done after it has run and passed, **and shown
the output of**, the checks relevant to the files it touched:

| Touched | Must pass |
|---|---|
| `programs/**` | `pnpm build:program` · `pnpm test:program` · `cargo clippy -- -D warnings` · then `pnpm idl:sync` and `pnpm typecheck` |
| `packages/shared/**` | `pnpm typecheck` · `pnpm build:web` |
| `apps/web/**` | `pnpm typecheck` · `pnpm lint` · `pnpm build:web` · a real request to the changed route on `pnpm dev:web` (curl output pasted) |
| `apps/mobile/**` | `pnpm typecheck` · `pnpm lint` · `npx expo-doctor` · on-device check via `pnpm android` reported by the human (agents cannot see the phone — say so, don't claim it) |
| `supabase/**` | `pnpm db:push` against the hosted project (human-approved) and a select showing the change |
| any | Zero-Mock grep from `MILESTONES.md` G1 is clean · `git status` shows no secrets staged |

If a check cannot be run in the agent's environment (no device, no keys), the
agent must say exactly which check is unverified. Never claim a Devnet tx, a
scrape, or a TTS call succeeded without a real signature / response to show.

---

## 8. Decisions Made During the Sprint

Append here (date, WAT time, who, decision, why). Keep PRD §9 in sync for big ones.

| When (WAT) | Who | Decision | Why |
|---|---|---|---|
| Fri (scaffold) | scaffold | Audio library (PRD D12): **`expo-audio` ~58.0.12** | Template is Expo SDK 58; `expo-av` is gone. |
| Fri (scaffold) | scaffold | Anchor **1.2.2** (`anchor-lang`, `[toolchain]` in `Anchor.toml`); TS client `@anchor-lang/core` 1.2.2 + `@solana/web3.js` 1.x | Latest stable. Anchor 1.x `CpiContext::new` takes the program id (`Pubkey`), not an `AccountInfo`. |
| Fri (scaffold) | scaffold | Mobile template **`expo-web3js-minimal`** (create-solana-dapp 4.8.5); MWA via `@wallet-ui/react-native-web3js` (PRD D15) | Same web3.js as shared/backend; no UI kit to fight the Swiss design. |
| Fri (scaffold) | scaffold | Program ID in repo is a throwaway until `anchor keys sync` | Real program keypair is generated on Builder A's machine and never committed. |
| — | — | Dedicated Devnet RPC provider: _fill_ | — |
| Block 2 | scaffold | **Hand-written program codec** in `packages/shared/src/codec.ts` (no Anchor TS / IDL at runtime) | Unblocks H2/H4 before the first `anchor build`; byte-for-byte pinned by `test/vectors/program.json`, which the Rust program regenerates (`UPDATE_VECTORS=1 cargo test -p policy-vault vectors_match`) and asserts. Changing the layout breaks both test suites. |
| Block 2 | scaffold | Voice path sends with **preflight on**; only the rogue route skips it (PRD D9) | A policy violation in the voice path is caught in simulation (no fee) and still reported as `ONCHAIN_REJECTED` with the validator's `PolicyError`; `tx_signature` is null then. |
| Block 2 | scaffold | If the audit insert fails after a payment, the response keeps `status: PASSED` + real signature and sets `error_code: AUDIT_WRITE_FAILED` | Never hide a completed on-chain transfer behind an error. |
| Block 2 | scaffold | Intent LLM fallback uses the official `@anthropic-ai/sdk` `messages.parse` + `zodOutputFormat` (structured outputs), `effort: "low"`; refusals fall back to the grammar result | Typed, schema-validated output; no forced `tool_choice`. |
| Block 2 | scaffold | **Proposed, not implemented:** `EXPO_PUBLIC_MERCHANT_CLEAN_WALLET` (public pubkey) so the mobile create form can prefill the demo allowlist (PRD §8.2) | Needs human OK per CLAUDE.md (new env var). Until then the form has an optional paste field; empty = open allowlist. |
