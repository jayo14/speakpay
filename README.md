# SpeakPay

**Talk to pay — inside spending limits the AI can't break.**

SpeakPay is a voice-controlled spending assistant for Android. You say what you want to
pay for. It checks the live merchant page for the real price and for hidden
prompt-injection scams, using Firecrawl. It pays only if the payment fits limits that a
custom Solana Anchor program enforces on Devnet.

> 🚧 Built during the Dev3pack Global Solana Hackathon (27–29 Nov 2026).
> The Judge & Sponsor Verification Map (Program ID, Explorer links, APK, video and
> file/line references) will be published here at feature freeze. Template: [`MILESTONES.md` §4](./MILESTONES.md#4-readmemd-template-fill-at-sat-1800-from-the-frozen-commit).

## Planning docs

| Doc | What's in it |
|---|---|
| [`PRD.md`](./PRD.md) | Vision, demo script, architecture, Anchor spec, API contracts, Supabase schema, screens, decisions log, scope |
| [`MILESTONES.md`](./MILESTONES.md) | 40-hour two-builder roadmap, handoff contracts, verification gates, submission checklist |
| [`AGENTS.md`](./AGENTS.md) / [`CLAUDE.md`](./CLAUDE.md) | Rules for AI coding agents (Zero-Mock policy, guardrails, done-checks) |
| [`ENVIRONMENT.md`](./ENVIRONMENT.md) | Every env var, public vs secret, and how to get each one |

## Stack

Solana Anchor (Devnet) · Solana Mobile Stack / Mobile Wallet Adapter (Expo custom dev build) ·
Next.js on Vercel · Firecrawl `/v2/scrape` with `checkPromptInjection` · ElevenLabs Scribe STT +
Flash TTS · Supabase Postgres + Realtime.
