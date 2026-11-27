# SpeakPay — 40-Hour Execution Milestones

> Kickoff **Fri 27 Nov 2026 16:00 WAT** → Hard cutoff **Sun 29 Nov 2026 08:00 WAT**.
> Internal submission target: **Sun 04:00 WAT** (4 h buffer).
> Spec of record: [`PRD.md`](./PRD.md). Agent rules: [`AGENTS.md`](./AGENTS.md). Env: [`ENVIRONMENT.md`](./ENVIRONMENT.md).

**Budget:** 50 % core build (20 h) · 25 % integration + Stage 2 (10 h) · 25 % APK, polish, README, video (10 h).

| Builder | Owns (write access) | Never edits without asking |
|---|---|---|
| **A — On-chain + API + Web** | `programs/`, `tests/`, `Anchor.toml`, `packages/shared/`, `apps/web/`, `supabase/` | `apps/mobile/` |
| **B — Mobile + Voice UX + Pitch** | `apps/mobile/`, `docs/` (diagram, video assets), `README.md` narrative sections | `programs/`, `packages/shared/` (request changes from A) |

Both may edit `PRD.md`/`MILESTONES.md` checkboxes. This split is why there are no merge conflicts: each directory has exactly one writer.

---

## 0. Pre-Kickoff (before Fri 16:00 WAT) — both

- [ ] Phantom Mobile: Settings → Developer Settings → Testnet Mode ON → Solana Devnet. Create a **fresh burner** wallet. Install Solflare Mobile as MWA backup.
- [ ] Generate local CLI keypairs (`deployer`, `agent-delegate`, `merchant-clean`, `merchant-shady-attacker`) per `ENVIRONMENT.md` §3 and fund deployer + burner + delegate at faucet.solana.com.
- [ ] Create accounts / keys: Firecrawl, ElevenLabs (pick voice ID), Supabase project, Vercel project, Expo account, (optional) Anthropic, dedicated Devnet RPC.
- [ ] Toolchain: Rust stable, Solana CLI (Agave), Anchor via `avm install latest && avm use latest`, Node 20+, pnpm 9+, Android Studio + platform tools (`adb devices` shows the phone), JDK 17.
- [ ] Repo is **public** on GitHub from commit 1. Both builders can push. Shared password manager / secure channel set up for `.env` values (never Slack/WhatsApp plaintext into the repo).

---

## 1. Interface Handoff Contracts (how nobody blocks)

| ID | Due (WAT) | From → To | Artifact | Until it lands, B works against… |
|---|---|---|---|---|
| **H0** | Fri 17:00 | A → B | `pnpm-workspace.yaml`, empty `packages/shared` with `constants.ts` (seeds, demo limits, error map, `RunStatus`) and `api-types.ts` copied verbatim from PRD §6 | PRD §4/§6 text (identical) |
| **H1** | Fri 22:00 | A → B | Program deployed on Devnet; `POLICY_VAULT_PROGRAM_ID` filled; `packages/shared/src/idl/policy_vault.{json,ts}`; `pda.ts` | H0 types; MWA connect + `signMessages` only |
| **H2** | Sat 00:00 | A → B | Vercel **preview** URL with `/api/health`, `/api/tx/owner`, `/api/vault/[owner]`, `/api/vault/sync` live on Devnet | Building Vault UI; MWA `signAndSendTransactions` wiring |
| **H3** | Sat 00:00 | A → B | Supabase migration applied; anon URL/key in shared secret store; Realtime enabled on `audit_runs` | Feed UI against empty table (real, just empty) |
| **H4** | Sat 04:00 | A → B | `/api/voice-command` live on preview, clean path PASSED via curl | Recording + upload UI; local playback of own recording |
| **H5** | Sat 12:00 | A → B | `/api/simulate-rogue`, `/merchants/shady`, `/api/audit/verify/[id]`, `/api/audit/freeze` live | Button/flow UI behind feature flags |

**Contract-change rule:** any change to `packages/shared` after H1 is announced in
the team channel *before* push, with the PRD section updated in the same commit.
PDA layout changes after H1 are forbidden unless both builders agree (redeploy +
vault re-init cost ≈ 1 h).

---

## 2. Hour-by-Hour Roadmap

### Block 1 — Core Build 1 · Fri 16:00–22:00 (6 h)

| WAT | Builder A | Builder B |
|---|---|---|
| 16:00–17:00 | Monorepo scaffold: `pnpm-workspace.yaml`, `anchor init` layout under `programs/policy-vault`, `packages/shared` skeleton, `apps/web` (Next.js App Router, TS). Ship **H0**. | `pnpm create solana-dapp@latest` → Solana Mobile (Expo) template into `apps/mobile`. Note Expo SDK version → decide audio lib (PRD D12), record in `AGENTS.md` §8. |
| 17:00–19:00 | `lib.rs`: accounts (§4.1, `InitSpace`), errors (§4.4), events (§4.5), all 6 instructions with §4.3 check order. `anchor build` green. | First native build over USB: `pnpm android` (custom dev client). MWA `authorize` against Phantom Devnet; sign a message; show pubkey. |
| 19:00–21:00 | Tests (§4.6): pass path + every revert 6000–6008; LiteSVM clock warp for cooldown + 24 h window. | Tab shell (Vault / Console / Feed), Swiss tokens (PRD §8.1), hold-to-talk recorder producing an `.m4a`, local playback of a data-URI MP3. |
| 21:00–22:00 | `anchor deploy --provider.cluster devnet`; copy IDL/types to shared; commit Program ID. Ship **H1**. | Install `@speakpay/shared`; PDA derivation shown on Vault screen for connected wallet. |

**M1 Definition of Done (both must be true at 22:00):**
- [ ] `anchor test` exits 0 with ≥ 15 tests including one per error 6000–6008.
- [ ] `solana program show $POLICY_VAULT_PROGRAM_ID --url devnet` returns the program with `ProgramData` owned by the deployer.
- [ ] Physical Android phone (not emulator-only, not Expo Go) shows the connected Phantom Devnet pubkey obtained through MWA.

### Block 2 — Core Build 2 · Fri 22:00–Sat 04:00 (6 h)

| WAT | Builder A | Builder B |
|---|---|---|
| 22:00–23:00 | Supabase: apply `001_init.sql`, verify Realtime publication. `lib/supabase-server.ts`, `lib/solana.ts` (connection, delegate signer, program client). | Vault screen UI: connect / create form / vault card / actions (wired to H2 contract shape). |
| 23:00–00:00 | `/api/health`, `/api/tx/owner`, `/api/vault/[owner]`, `/api/vault/sync`. First Vercel preview deploy. Ship **H2 + H3**. | MWA `signAndSendTransactions` for a base64 tx; error toast for user-rejected. |
| 00:00–02:00 | `/merchants/clean`; `lib/elevenlabs.ts` (STT+TTS), `lib/firecrawl.ts` (with `checkPromptInjection: true`, `maxAge: 0`), `lib/intent.ts` grammar, `packages/shared/src/evidence.ts`. | **Real** `init_policy_vault` + `deposit 0.20 SOL` from phone via H2 → verify on Explorer. Vault card reads live state. |
| 02:00–04:00 | `/api/voice-command` orchestrator (PRD §6.4–6.6) → curl with a real recorded `.m4a` of the canonical command → PASSED on Devnet. Ship **H4**. | Voice Console: upload to `/api/voice-command`, stepper, result card, autoplay TTS. Feed screen: Supabase initial select + Realtime subscription. |

**M2 Definition of Done (04:00):**
- [ ] `curl -F audio=@canonical.m4a -F vault_pda=$PDA -F owner_pubkey=$OWNER -F client=api $PREVIEW/api/voice-command` returns `status: "PASSED"` with a `tx_signature` that Explorer shows as **Success** transferring 0.02 SOL VaultFunds → merchant-clean.
- [ ] The same run appears as a row in Supabase `audit_runs` (Table Editor) with non-null `evidence_hash`, `scraped_json`, `tx_signature`.
- [ ] Phone created + funded its own vault on Devnet via MWA (Explorer links saved in team notes).

### Rest · Sat 04:00–08:00 (4 h) — **mandatory, both builders sleep.**

### Block 3 — Integration + Stage 1 Gate · Sat 08:00–10:00 (2 h)

| WAT | Builder A | Builder B |
|---|---|---|
| 08:00–10:00 | `/dashboard` Web Companion: Wallet Adapter connect, vault card + owner actions, browser `MediaRecorder` console, Realtime feed, read-only `?vault=` mode. Production Vercel deploy. | Point APK at production URL; full voice pay from phone; fix integration bugs; feed updates live on phone **and** on `/dashboard?vault=`. |

**🚦 G1 — STAGE 1 GATE (Sat 10:00, both sign off; Stage 2 must not start before):**
- [ ] On the physical phone: connect → create vault → deposit → speak canonical command → TTS confirms → Explorer link shows Success → Feed row `PASSED` appears on phone **and** web within 3 s.
- [ ] Same flow fully from the Web Companion in a desktop browser with Phantom extension.
- [ ] `/api/health` returns `ok: true`, `env_missing: []`, `program_deployed: true`.
- [ ] Zero-Mock grep returns nothing (see `AGENTS.md` §3): `grep -rniE "\b(mock|fake|dummy|lorem)" apps packages programs --include=*.ts --include=*.tsx --include=*.rs --exclude-dir=node_modules`
- If G1 is not green by **Sat 12:00**, cut T3's UI badge to a text-only verify link and T4's voice trigger to a Freeze button; never cut Stage 1.

### Block 4 — Stage 2: The 4 Tweaks · Sat 10:00–14:00 (4 h)

| WAT | Builder A | Builder B |
|---|---|---|
| 10:00–12:00 | **T1** `/api/simulate-rogue` (skipPreflight, decode `PolicyError` from tx meta/logs). **T2** `/merchants/shady` + run the 10/10 Firecrawl 403 loop; tune wording until 10/10. | Rogue buttons (0.5 SOL / 0.01 SOL) + `ONCHAIN_REJECTED` result card with Explorer link; `INJECTION_BLOCKED` card + red state. |
| 12:00–14:00 | **T3** `/api/audit/verify/[id]`. **T4** freeze grammar → `next_action: "sign_freeze"`, `/api/audit/freeze`. Ship **H5**. | Verify badge on result card + feed detail; freeze flow: auto-open MWA `toggle_freeze(true)` → `/api/audit/freeze` → TTS. Unfreeze button on Vault screen. |

**M4 Definition of Done (14:00):**
- [ ] T1: rogue 0.5 SOL → Explorer shows a **failed** tx with custom program error `0x1771` (6001 `ExceedsMaxPerTx`); feed row `ONCHAIN_REJECTED`.
- [ ] T2: `/merchants/shady` returns 403 `SCRAPE_PROMPT_INJECTION_DETECTED` 10/10 times (log saved for README); no `tx_signature` on those rows.
- [ ] T3: verify returns `match: true` for the latest PASSED run, and `match: false` if one byte of the stored transcript is altered in a scratch copy (do not edit real rows).
- [ ] T4: "Freeze my vault" → one MWA approval → PDA `is_frozen = true` on Explorer account view → rogue 0.01 SOL fails with `0x1770` (6000 `VaultFrozen`).

### Block 5 — Hardening + APK · Sat 14:00–18:00 (4 h)

| WAT | Builder A | Builder B |
|---|---|---|
| 14:00–16:00 | Stress: cooldown (two pays < 30 s → `CooldownActive`), daily cap (fill to 0.15 → `ExceedsDailyCap`), withdraw_all while frozen, unfreeze → pay again. Switch to dedicated RPC. Error/timeout budgets (PRD §9.1). | `eas build -p android --profile preview` (APK). Install on a **second, clean** Android device or after uninstalling; run the full demo. Upload to GitHub Release `v1.0.0-hackathon`. |
| 16:00–18:00 | Bug fixes only. Re-run G1 + M4 checks on production. | UI polish (states, empty states, error copy), pre-demo reset checklist runnable from the app (shows balances, cooldown, frozen). |

**🧊 FEATURE FREEZE — Sat 18:00 WAT.** After this: bug fixes, docs, video only.
Any new feature needs both builders to agree *and* is reverted at 22:00 if not green.

**🚦 G2 — STAGE 2 GATE (Sat 18:00):** M4 checks pass again on production + the installed release APK.

### Block 6 — README, Diagram, Video · Sat 18:00–23:00 (5 h)

| WAT | Builder A | Builder B |
|---|---|---|
| 18:00–21:00 | `README.md` Judge & Sponsor Verification Map (§4 template) with **exact file paths + line numbers** taken from the frozen commit; Explorer links (deploy, PASSED, ONCHAIN_REJECTED ×2, freeze); Firecrawl 403 log screenshot; sample `audit_runs` JSON whose hash matches on-chain. | Excalidraw diagram → `docs/architecture.excalidraw` + `docs/architecture.png`. Video script from PRD §2. Rehearse 3×. |
| 21:00–23:00 | Run the second-screen dashboard + Explorer during recording; re-verify every link in README opens. | Record the 2:45 demo (phone screen capture + Explorer side-by-side), edit to < 3:00, upload (YouTube unlisted / Loom), link in README. |

### Block 7 — Submit + Buffer · Sat 23:00–Sun 04:00 (5 h)

| WAT | Builder A | Builder B |
|---|---|---|
| 23:00–01:00 | Fill Dev3pack form: Best Overall, Solana Mobile, Nigeria Local, Firecrawl, ElevenLabs, Supabase — paste file:line references from README. | Build-in-public X thread tagging @dev3pack @solana @solanamobile @firecrawl_dev @elevenlabsio @supabase with video + repo. |
| 01:00–04:00 | Submission checklist (§3) twice, independently. **Submitted by 04:00.** | Same, independently. |

**Sun 04:00–08:00:** buffer only. No commits to `main` except README link fixes.
Re-line-number the README if any such fix shifts referenced lines.

---

## 3. Submission & Stage-1 AI-Audit Readiness Checklist

Run twice, by each builder independently, from a **logged-out browser** and a
**fresh clone**.

### 3.1 Repository
- [ ] Repo is **public**; default branch contains the frozen commit; no force-pushes after submission.
- [ ] `git log --all -p | grep -nE "BEGIN (RSA|EC|OPENSSH) PRIVATE|sk_live|service_role|\[[0-9]{1,3}(,[0-9]{1,3}){63}\]"` returns nothing (no keys, no 64-byte keypair arrays).
- [ ] `.env.example` files exist for `apps/web` and `apps/mobile`, contain no real values.
- [ ] `pnpm install && pnpm -r build && anchor build && anchor test` succeed on a fresh clone (except for steps needing secrets, which are documented).
- [ ] Zero-Mock grep (G1) clean. No seeded rows, no hardcoded signatures, balances or hashes in source.

### 3.2 Live Deployments
- [ ] Program ID in README == `declare_id!` == `Anchor.toml` == Vercel env == APK env. `solana program show` on Devnet succeeds.
- [ ] Production Vercel URL loads `/dashboard` (no landing page), `/merchants/clean`, `/merchants/shady`, `/api/health` → `ok: true`.
- [ ] `/merchants/shady` re-verified to 403 within 1 h of submission.
- [ ] Supabase `audit_runs` contains only real runs (each PASSED/ONCHAIN_REJECTED/FROZEN row's `tx_signature` resolves on Explorer).
- [ ] `agent_delegate` has ≥ 0.2 Devnet SOL; demo vault has ≥ 0.1 SOL and is **unfrozen** for judges.

### 3.3 Android APK
- [ ] GitHub Release `v1.0.0-hackathon` has `speakpay-devnet.apk` attached, installs on a clean Android device, and runs without Metro (release/preview profile, not a dev client needing a bundler).
- [ ] Install instructions in README (enable unknown sources, Phantom Devnet).

### 3.4 Media
- [ ] Video < 3:00, public/unlisted link plays logged-out, shows all beats of PRD §2.
- [ ] `docs/architecture.png` renders in README.

### 3.5 Form
- [ ] Tracks selected: Best Overall, Solana Mobile, Nigeria Local, Firecrawl, ElevenLabs, Supabase.
- [ ] Every sponsor field pastes the file:line references from the README map.
- [ ] Submitted, confirmation screenshot saved. **Time: ≤ Sun 04:00 WAT.**

---

## 4. `README.md` Template (fill at Sat 18:00 from the frozen commit)

Line numbers must come from the exact commit judges see. Regenerate them with
`grep -n` (commands below) after the last code change. Use GitHub permalinks
(`/blob/<commit-sha>/path#L10-L42`) so the links never drift.

````markdown
# SpeakPay — talk to pay, inside limits the AI can't break

Voice-first Solana Mobile treasury agent. Speak a payment goal → Firecrawl
verifies the live merchant page and blocks prompt injection → a scoped agent key
pays through a custom Anchor program that enforces spending limits on-chain.

**Live:** <VERCEL_URL>/dashboard · **APK:** <RELEASE_URL> · **Video (2:45):** <VIDEO_URL>
**Program (Devnet):** `<PROGRAM_ID>` — [Explorer](https://explorer.solana.com/address/<PROGRAM_ID>?cluster=devnet)

## Judge & Sponsor Verification Map

| Integration | What to check | Where (permalinks) | Live proof |
|---|---|---|---|
| **Solana — Anchor program** | 6 instructions, PDA vault, ordered policy checks, `PolicyError` | `programs/policy-vault/src/lib.rs#L<a>-L<b>` (`execute_guarded_transfer`), `#L<c>-L<d>` (`PolicyError`) | Deploy tx · PASSED tx · Rogue `ExceedsMaxPerTx` tx · `VaultFrozen` tx |
| **Solana — tests** | pass + revert per error | `tests/policy-vault.ts#L..` | CI / `anchor test` output |
| **Solana Mobile — MWA** | `transact()` authorize + `signAndSendTransactions` | `apps/mobile/src/mwa.ts#L..` | APK release |
| **Firecrawl** | `POST /v2/scrape`, top-level `checkPromptInjection: true`, JSON schema, 403 handling | `apps/web/lib/firecrawl.ts#L..`, `apps/web/app/api/voice-command/route.ts#L..` | `docs/firecrawl-403.png` + audit row `INJECTION_BLOCKED` |
| **ElevenLabs STT** | `scribe_v3`, keyterms | `apps/web/lib/elevenlabs.ts#L..` | transcript in any audit row |
| **ElevenLabs TTS** | `eleven_flash_v2_5`, base64 MP3 | `apps/web/lib/elevenlabs.ts#L..` | video |
| **Supabase** | schema, RLS, Realtime | `supabase/migrations/001_init.sql#L..`, `apps/mobile/src/supabase.ts#L..`, `apps/web/app/dashboard/page.tsx#L..` | sample row below |
| **Evidence hash** | preimage → SHA-256 → on-chain | `packages/shared/src/evidence.ts#L..`, `lib.rs#L..` (`ExecutionAudited`) | `/api/audit/verify/<run_id>` → `match: true` |

### Sample audit receipt (real row, matches tx `<SIG>`)
```json
{ "status": "PASSED", "evidence_hash": "<hex>", "tx_signature": "<SIG>", "...": "..." }
```
Recompute: `<VERCEL_URL>/api/audit/verify/<run_id>`.

## Architecture
![architecture](docs/architecture.png)

## Security model
<3 bullets from PRD §3.2 + known limitations PRD §10.4>

## Why self-hosted merchant pages are not mocks
<PRD D6, 2 sentences>

## Run it
<link ENVIRONMENT.md; pnpm commands from AGENTS.md §4>

## Team
<names, handles, Nigeria Local track note>
````

**Line-number helper commands** (run from repo root on the frozen commit):

```bash
grep -nE "pub fn (init_policy_vault|deposit|update_policy|execute_guarded_transfer|toggle_freeze|withdraw_all)|pub enum PolicyError|pub struct ExecutionAudited" programs/policy-vault/src/lib.rs
```

```bash
grep -rnE "v2/scrape|checkPromptInjection|SCRAPE_PROMPT_INJECTION_DETECTED|speech-to-text|text-to-speech|scribe|eleven_flash" apps/web
```

```bash
grep -rnE "transact\(|signAndSendTransactions|authorize\(" apps/mobile/src
```

```bash
grep -rnE "channel\(|postgres_changes|supabase_realtime" apps supabase
```

```bash
git rev-parse HEAD
```
