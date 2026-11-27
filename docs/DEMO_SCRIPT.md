# SpeakPay — 2:45 Demo Video Script

Target **2:45**, hard cap **< 3:00**. Every beat is a live Devnet action (PRD §2): no mock screens, no
pre-recorded API responses, no editing that hides latency. If a take fails, **re-record it**; don't cut
around it.

## Recording setup

| Item | Setup |
|---|---|
| Phone screen | Android over USB, mirrored with `scrcpy --max-size 1080 --stay-awake` and captured in OBS (left half). |
| Explorer | Desktop browser at `https://explorer.solana.com/?cluster=devnet` (right half). Open each tx link the app shows. |
| Second screen | `/dashboard?vault=<vault PDA>` in another tab, to show the Realtime feed landing live. |
| Audio | Phone TTS captured through OBS audio (or a phone speaker near the mic). The narration mic is muted while you speak voice commands into the phone. |
| Layout | 1920×1080, phone left at ~45 % width, Explorer or dashboard right. Large cursor; browser zoom 125 %. |
| Captions | Burn in short captions for each proof ("Proof 1 · compliant payment", …), since judges often watch muted. |

## Before every take

- [ ] Phone Vault tab shows **Demo ready** with all checks green (unfrozen, vault ≥ 0.10 SOL, delegate ≥ 0.05 SOL, cooldown elapsed, room under the daily cap).
- [ ] The `pnpm firecrawl:check <prod-url>` 10/10 pass is less than 1 hour old.
- [ ] Phantom is on **Devnet** and the dev build is closed (record with the **release APK**, Metro off).
- [ ] Do Not Disturb is on and the phone is at 100 % brightness.
- [ ] For a full re-take, use a **fresh owner wallet**: the daily cap and cooldown carry over on the old vault.

## Shot list

| Time | Screen (left: phone · right: Explorer/dashboard) | Narration (≈ words) |
|---|---|---|
| **0:00–0:15** Hook | Phone on the Console tab. Caption: *"AI agents need keys. Keys get stolen."* | "Would you give an AI agent your wallet? Agents read the open web, and the open web lies. SpeakPay lets you pay by voice, inside limits that even a hacked AI can't break." (≈ 35) |
| **0:15–0:30** Setup | Vault tab: Connect → Phantom MWA approve → **Create vault** (limits prefilled) → approve → **Deposit 0.20 SOL** → approve. Vault card updates. | "I sign once with my own wallet through Mobile Wallet Adapter, to create a vault on Solana. Max 0.05 SOL a payment, 0.15 a day, a 30-second cooldown, and only one allowed merchant." (≈ 35) |
| **0:30–0:55** Proof 1 · compliant payment | Hold to talk: *"Check the Dev3pack merchant page — if the Starter Plan is under 0.05 SOL, pay them."* Stepper → TTS plays → result card `PASSED`, **no wallet popup**. Tap the Explorer link (right: Success). Tap **Verify evidence on-chain** → ✓. Dashboard row appears. | "Firecrawl reads the live page, ElevenLabs speaks the verified price, and my agent pays by itself, with no popup. The receipt's evidence hash matches what Solana recorded." (≈ 30) |
| **0:55–1:15** Proof 2 · prompt injection | Hold to talk: *"Check the Shady Deals merchant page and pay for the discount plan."* TTS warning → `INJECTION_BLOCKED`. Right: the shady page's fine print, then the feed row with no tx. | "This page hides an instruction telling the agent to send 0.5 SOL to an attacker. Firecrawl's injection guard rejects it before any AI or signer ever sees it. Nothing was sent." (≈ 32) |
| **1:15–1:45** Proof 3 · rogue agent | Scroll to *Security test* → **Simulate rogue agent: pay 0.5 SOL**. Result `ONCHAIN_REJECTED · ExceedsMaxPerTx (6001)`. Right: Explorer shows the **failed** tx with `custom program error: 0x1771`. | "Now assume the worst: the server is hacked and the agent key is stolen. This skips the voice, the AI and every check we wrote, and asks Solana for 0.5 SOL directly. The validator refuses. The guardrail is the blockchain, not a prompt." (≈ 45) |
| **1:45–2:00** Voice kill switch | Hold to talk: *"Freeze my vault."* Phantom opens → approve → TTS *"Vault frozen…"* → feed row `FROZEN`. | "One sentence and one tap, and the vault is frozen on-chain." (≈ 12) |
| **2:00–2:08** Post-freeze proof | **Simulate rogue agent: pay 0.01 SOL** → `VaultFrozen (6000)`; Explorer shows the failed tx `0x1770`. | "Even a tiny payment from the agent key now fails." (≈ 10) |
| **2:08–2:30** Architecture | Full-screen `docs/architecture.png`, slow zoom from phone to Solana box. | "Expo app with Mobile Wallet Adapter; a Next.js API on Vercel; ElevenLabs for voice in and out; Firecrawl for verified, injection-checked web data; an Anchor policy vault on Solana; and Supabase for the live, recomputable audit trail." (≈ 40) |
| **2:30–2:45** Close | Phone Feed tab scrolling all runs, then the title card: *SpeakPay · github.com/jayo14/speakpay · Android APK in Releases*. | "Talk to pay, inside limits the AI can't break. Built on Solana Mobile, for anyone, from Lagos to everywhere, who wants an agent they can actually trust." (≈ 30) |

Narration totals about 270 words over 2:45, which is a comfortable pace with pauses for TTS playback. If a
beat runs long, trim narration rather than cut live footage.

## Honesty rules (from PRD §2)

- Quote a latency only if the recording shows it (the result card prints measured `timings_ms`).
  Never say "150 ms" unless the stopwatch on screen shows it.
- Show the real Explorer pages for each signature; don't use screenshots taken from a different run.
- If you used the web dashboard instead of the phone for any beat, say so on screen.
- Recorded on Solana **Devnet** with no real funds: say it once in the setup beat or a caption.

## After recording

1. Export at 1080p, check that the duration is under 3:00, and watch it once with sound off (captions alone should tell the story).
2. Upload as YouTube **unlisted** (or Loom) and confirm it plays in a logged-out browser.
3. Put the URL in `docs/live-proofs.json` (`video_url`) and run `pnpm readme:map`.
