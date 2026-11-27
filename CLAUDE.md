# CLAUDE.md

**Read [`AGENTS.md`](./AGENTS.md) first — it is the binding rulebook for this repo.**
This file only adds Claude Code specifics.

## Before any task
1. Read `AGENTS.md` (rules), then the PRD section the task touches (`PRD.md` §4 program,
   §5 sponsors, §6 API, §7 DB, §8 screens).
2. Check `MILESTONES.md` for the current gate. Stage 2 work (PRD §10.2) is blocked until G1 is ticked.
3. Confirm which builder you are working for (A: `programs/ tests/ packages/ apps/web/ supabase/`;
   B: `apps/mobile/ docs/`). Stay inside that territory.

## Working style
- Plan briefly, then make the smallest change that satisfies the PRD contract. Do not
  invent new routes, fields, statuses or env vars — if one seems needed, propose it and
  update PRD + `ENVIRONMENT.md` in the same commit after the human agrees.
- Commit after each logical step with a one-line conventional message
  (`feat: …`, `fix: …`, `test: …`, `docs: …`, `chore: …`). Use the human's git identity;
  do not add AI co-author trailers.
- Run the `AGENTS.md` §7 checks for the files you touched and paste the output before
  saying "done". If you cannot run something (phone, wallet popup, secrets), say so explicitly.

## Claude Code specifics
- You cannot see the Android phone or approve Phantom popups. For MWA flows, implement,
  typecheck, and hand the human a numbered on-device test script.
- Never `cat`, echo, or paste `.env*` files or keypair JSON into the conversation.
  Check presence with `test -n "$VAR"` or `/api/health` instead.
- Prefer `pnpm --filter <workspace> <script>` over `cd` chains.
- Long-running dev servers (`pnpm dev:web`, `pnpm dev:mobile`) go in the background;
  stop them when finished.
- When a sponsor API rejects a request, read the live docs before changing the payload;
  do not fall back to v1 Firecrawl or WebRTC ElevenLabs (forbidden by `AGENTS.md` §5.3).
- Intent-parser LLM fallback (optional, `INTENT_LLM_ENABLED=true`) uses the Anthropic API
  with model `claude-haiku-5-5` and receives the **transcript only**.
