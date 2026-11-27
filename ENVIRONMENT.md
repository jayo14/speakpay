# SpeakPay — Environment & Secrets Guide

> **No real secrets in this file or in git — ever.** Real values live in
> `apps/web/.env.local` (git-ignored), Vercel Project → Settings → Environment
> Variables, `apps/mobile/.env` (git-ignored) and EAS environment variables.
> Templates: [`apps/web/.env.example`](./apps/web/.env.example), [`apps/mobile/.env.example`](./apps/mobile/.env.example).

Legend: **PUBLIC** = safe to ship to browsers/APK (still not committed with real values) ·
**SECRET** = server-only, never prefixed `NEXT_PUBLIC_`/`EXPO_PUBLIC_`, never logged.

---

## 1. Variable Inventory

### 1.1 `programs/policy-vault` (Anchor CLI — no `.env`)

Configured in `Anchor.toml` and your local Solana CLI config, not env files.

| Setting | Where | Value | Class |
|---|---|---|---|
| `[provider] cluster` | `Anchor.toml` | `devnet` | public |
| `[provider] wallet` | `Anchor.toml` | `~/.config/solana/speakpay/deployer.json` (path only; the file is outside the repo) | path |
| `[programs.devnet] policy_vault` | `Anchor.toml` | Program ID (after `anchor keys sync`) | PUBLIC |
| `declare_id!` | `programs/policy-vault/src/lib.rs` | same Program ID | PUBLIC |
| Program keypair | `target/deploy/policy_vault-keypair.json` | defines the Program ID; **git-ignored, back it up** in the team password manager | **SECRET** |
| `POLICY_VAULT_PROGRAM_ID` | your shell only (`export`) | same Program ID, used by CLI commands in `MILESTONES.md` | PUBLIC |

### 1.2 `apps/web` (Next.js — `.env.local` locally, Vercel env in prod)

| Variable | Class | Example / default | Used by |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | PUBLIC | `https://speakpay.vercel.app` (prod) / `http://localhost:3000` | merchant registry URLs, MWA identity, links |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | PUBLIC | `devnet` | Wallet Adapter, Explorer links |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | PUBLIC | `https://api.devnet.solana.com` | browser wallet adapter connection |
| `NEXT_PUBLIC_POLICY_VAULT_PROGRAM_ID` | PUBLIC | Program ID | client + server program client |
| `NEXT_PUBLIC_SUPABASE_URL` | PUBLIC | `https://<ref>.supabase.co` | dashboard Realtime + server client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | PUBLIC | anon / publishable key | dashboard reads + Realtime |
| `SOLANA_RPC_URL` | **SECRET** (may embed a provider key) | dedicated Devnet RPC URL | all server chain calls |
| `AGENT_DELEGATE_SECRET_KEY` | **SECRET** | JSON array of 64 numbers, one line | signs `execute_guarded_transfer` |
| `MERCHANT_CLEAN_WALLET` | public value, server-side | base58 pubkey | `/merchants/clean`, rogue recipient, demo allowlist |
| `MERCHANT_SHADY_ATTACKER_WALLET` | public value, server-side | base58 pubkey | `/merchants/shady` injection text |
| `FIRECRAWL_API_KEY` | **SECRET** | `fc-…` | `lib/firecrawl.ts` |
| `ELEVENLABS_API_KEY` | **SECRET** | `sk_…` | `lib/elevenlabs.ts` |
| `ELEVENLABS_VOICE_ID` | server config | voice ID string | TTS |
| `ELEVENLABS_STT_MODEL_ID` | server config | `scribe_v3` | STT |
| `ELEVENLABS_TTS_MODEL_ID` | server config | `eleven_flash_v2_5` | TTS |
| `SUPABASE_SERVICE_ROLE_KEY` | **SECRET** | service_role / secret key | `lib/supabase-server.ts` (all writes) |
| `ROGUE_SIM_ENABLED` | server config | `true` | gates `/api/simulate-rogue` |
| `INTENT_LLM_ENABLED` | server config | `false` | optional LLM fallback in `lib/intent.ts` |
| `INTENT_LLM_MODEL` | server config | `claude-haiku-5-5` | LLM fallback model |
| `ANTHROPIC_API_KEY` | **SECRET** (optional) | `sk-ant-…` | only if `INTENT_LLM_ENABLED=true` |

### 1.3 `apps/mobile` (Expo — `.env` locally, EAS env for builds)

Only `EXPO_PUBLIC_*` variables exist here; **every one is compiled into the APK and is public.**

| Variable | Example / default | Used by |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | `https://speakpay.vercel.app` (= `NEXT_PUBLIC_APP_URL`) | all API calls |
| `EXPO_PUBLIC_SOLANA_CLUSTER` | `devnet` | MWA `authorize({ chain: "solana:devnet" })`, Explorer links |
| `EXPO_PUBLIC_SOLANA_RPC_URL` | `https://api.devnet.solana.com` | confirmation polling (public RPC; no keyed URL in the APK) |
| `EXPO_PUBLIC_POLICY_VAULT_PROGRAM_ID` | Program ID | PDA derivation |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | feed + Realtime |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key | feed + Realtime |
| `EXPO_PUBLIC_APP_IDENTITY_NAME` | `SpeakPay` | MWA app identity shown in Phantom |
| `EXPO_PUBLIC_APP_IDENTITY_URI` | `https://speakpay.vercel.app` | MWA app identity URI |

EAS-only (never in `.env`, never in the repo): `EXPO_TOKEN` (**SECRET**, CI only),
Android keystore (EAS-managed credentials).

### 1.4 `supabase/` (Supabase CLI — your shell only)

| Variable | Class | Used by |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | **SECRET** | `supabase login` / CI |
| `SUPABASE_PROJECT_REF` | public | `supabase link --project-ref $SUPABASE_PROJECT_REF` |
| `SUPABASE_DB_PASSWORD` | **SECRET** | `supabase db push` |

### 1.5 Cross-file consistency rules

- `NEXT_PUBLIC_POLICY_VAULT_PROGRAM_ID` == `EXPO_PUBLIC_POLICY_VAULT_PROGRAM_ID` == `Anchor.toml` == `declare_id!`.
- `EXPO_PUBLIC_API_BASE_URL` == `EXPO_PUBLIC_APP_IDENTITY_URI` == `NEXT_PUBLIC_APP_URL` (prod).
- `EXPO_PUBLIC_SUPABASE_*` == `NEXT_PUBLIC_SUPABASE_*`.
- The delegate pubkey derived from `AGENT_DELEGATE_SECRET_KEY` is what `/api/tx/owner`
  puts in `init_policy_vault.agent_delegate`, and what `/api/health` reports.
- Demo constants (not env — in `packages/shared/src/constants.ts`): `max_per_tx = 50_000_000`,
  `daily_cap = 150_000_000`, `cooldown_secs = 30`, deposit `200_000_000` lamports (PRD §2).

---

## 2. Obtaining Each Value — Step by Step

### 2.1 Toolchain (once per laptop)

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
```

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --force && avm install latest && avm use latest
```

```bash
solana config set --url https://api.devnet.solana.com
```

Record the installed Anchor version in `Anchor.toml` `[toolchain]` and in `AGENTS.md` §8.

### 2.2 Keypairs (stored **outside** the repo)

```bash
mkdir -p ~/.config/solana/speakpay
```

```bash
for k in deployer agent-delegate merchant-clean merchant-shady-attacker; do solana-keygen new --no-bip39-passphrase -s -o ~/.config/solana/speakpay/$k.json; done
```

```bash
for k in deployer agent-delegate merchant-clean merchant-shady-attacker; do echo "$k $(solana-keygen pubkey ~/.config/solana/speakpay/$k.json)"; done
```

- `MERCHANT_CLEAN_WALLET` = pubkey of `merchant-clean`.
- `MERCHANT_SHADY_ATTACKER_WALLET` = pubkey of `merchant-shady-attacker` (never funded; it should never receive anything).
- `AGENT_DELEGATE_SECRET_KEY` = one-line contents of `agent-delegate.json`. Copy it straight
  into Vercel / `.env.local` without printing it into shared terminals or chats:

```bash
jq -c . ~/.config/solana/speakpay/agent-delegate.json | pbcopy   # macOS; use xclip -sel clip on Linux
```

- **Owner wallet** = your Phantom Mobile burner (Testnet Mode → Devnet). It is never a CLI keypair and never touches the server.

### 2.3 Devnet SOL

Targets: deployer **≥ 5 SOL** (program deploy ≈ 2–4 SOL; redeploys need more),
agent-delegate **≥ 0.2 SOL** (fees + rogue tests), each Phantom burner **≥ 1 SOL**.

1. https://faucet.solana.com → paste address → Devnet (sign in with GitHub for a higher limit).
2. CLI fallback: `solana airdrop 2 <ADDRESS> --url devnet` (rate-limited; retry later).
3. Move SOL between your own wallets with `solana transfer` if one faucet drop succeeds.

Fund on **Friday before 16:00** — faucets saturate during hackathon nights.

### 2.4 Program ID

```bash
anchor build && anchor keys sync && anchor build
```

`anchor keys sync` writes the ID from `target/deploy/policy_vault-keypair.json` into
`declare_id!` and `Anchor.toml`. Copy it to both `*_POLICY_VAULT_PROGRAM_ID` env vars.
Back up the program keypair in the team password manager so either builder can redeploy
to the **same** ID.

### 2.5 Solana RPC

- Default: `https://api.devnet.solana.com` (public, rate-limited).
- Recommended for `SOLANA_RPC_URL` by Saturday: a free dedicated Devnet endpoint
  (Helius, QuickNode, Triton). Dashboard → create endpoint → **Devnet** → copy URL.
  Keyed URLs go **only** in `SOLANA_RPC_URL` (server), never in `EXPO_PUBLIC_*`.

### 2.6 Firecrawl

firecrawl.dev → sign in → Dashboard → **API Keys** → copy (`fc-…`) → `FIRECRAWL_API_KEY`.
Check the plan has credits for ~200 scrapes (testing + 10/10 injection loop + takes).
Verify the key and the injection flag on Friday night against the deployed `/merchants/shady`.

### 2.7 ElevenLabs

1. elevenlabs.io → Profile → **API Keys** → create key with Speech-to-Text and
   Text-to-Speech permissions → `ELEVENLABS_API_KEY`.
2. **Voices** → pick a clear, calm voice → copy its **Voice ID** → `ELEVENLABS_VOICE_ID`.
3. Keep `ELEVENLABS_STT_MODEL_ID=scribe_v3` and `ELEVENLABS_TTS_MODEL_ID=eleven_flash_v2_5`.
   If either returns a model-not-found error, set the current GA model ID from the
   ElevenLabs docs (config change only — PRD §9.1).

### 2.8 Supabase

1. supabase.com → New project (region closest to Vercel's, e.g. `eu-west`/`eu-central`) → save the DB password as `SUPABASE_DB_PASSWORD`.
2. Project Settings → **API**: Project URL → `*_SUPABASE_URL`; anon / publishable key →
   `*_SUPABASE_ANON_KEY`; service_role / secret key → `SUPABASE_SERVICE_ROLE_KEY`
   (either the legacy JWT keys or the newer `sb_publishable_…` / `sb_secret_…` keys work with supabase-js).
3. Project ref = the `<ref>` in the URL → `SUPABASE_PROJECT_REF`.
4. Account → Access Tokens → `SUPABASE_ACCESS_TOKEN` (CLI only).
5. Apply schema: `supabase link --project-ref $SUPABASE_PROJECT_REF` then `pnpm db:push`.
6. Database → Publications → confirm `supabase_realtime` includes `audit_runs` and `vault_profiles`.

### 2.9 LLM intent fallback (optional)

Only if `INTENT_LLM_ENABLED=true`: console.anthropic.com → API Keys → `ANTHROPIC_API_KEY`.
Model `claude-haiku-5-5`. The deterministic grammar must work with this disabled.

### 2.10 Vercel

1. Import the GitHub repo → Root Directory `apps/web` → Framework Next.js; enable
   "Include files outside the root directory" so `packages/shared` builds.
2. Add every §1.2 variable for **Production** and **Preview**.
3. After the first prod deploy, set `NEXT_PUBLIC_APP_URL` to the prod domain and redeploy.

### 2.11 Expo / EAS (Android APK)

1. expo.dev → create account → `npx eas-cli login` → `npx eas-cli init` inside `apps/mobile`.
2. `apps/mobile/eas.json` profiles: `development` (`developmentClient: true`,
   `distribution: internal`) and `preview` (`android.buildType: "apk"`, `distribution: internal`).
3. **Gotcha:** `.env` is git-ignored, so EAS cloud builds don't see it. Set every §1.3
   variable for the `preview` environment with `npx eas-cli env:create` (visibility
   *plain text* — they're public anyway) or in the `env` block of the `preview` profile.
4. Build: `pnpm apk` → download the `.apk` → attach to GitHub Release `v1.0.0-hackathon`.
5. Local fallback if the EAS queue is long: `npx expo prebuild -p android` then
   `npx expo run:android --variant release`.

### 2.12 Phantom / Solflare (Android)

Phantom → avatar → Settings → Developer Settings → **Testnet Mode ON** → Solana **Devnet**.
Use a burner only. Solflare Mobile → Settings → Network → Devnet (backup MWA wallet).

---

## 3. Local Setup Order (fresh clone)

1. `pnpm install`
2. `cp apps/web/.env.example apps/web/.env.local` and `cp apps/mobile/.env.example apps/mobile/.env`; fill from §2.
3. `pnpm build:program && pnpm test:program` (program keypair restored to `target/deploy/` if redeploying).
4. `pnpm db:push` (first time only).
5. `pnpm dev:web` → open `http://localhost:3000/api/health` → expect `env_missing: []`.
6. Phone on USB with debugging on → `pnpm android`. For a phone hitting a laptop API,
   use the Vercel preview URL in `EXPO_PUBLIC_API_BASE_URL` (simplest) or `adb reverse tcp:3000 tcp:3000` with `http://localhost:3000`.

---

## 4. Rotation & Incident

- Leaked `AGENT_DELEGATE_SECRET_KEY`: owner calls `toggle_freeze(true)` immediately →
  generate a new delegate → `update_policy` with the new `agent_delegate` → update Vercel env → unfreeze.
- Leaked API key: revoke in the vendor dashboard, create a new one, update Vercel, redeploy.
- Leaked `SUPABASE_SERVICE_ROLE_KEY`: rotate in Project Settings → API; update Vercel.
- Accidentally committed a secret: rotate first, then remove from history — rotation is what actually fixes it.
