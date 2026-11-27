# Backend Handoff from the Frontend Redesign

The redesign (`claude/frontend-ux-redesign`) changes **only frontend files**. These items need backend
work before their UI can be switched on. Nothing below has been implemented.

## 1. Cancel countdown before paying (decided — needed for the feature)

**User story:** after speaking, the user sees "Paying Dev3pack 0.02 SOL in 5… Cancel / Pay now", and nothing moves until the countdown ends. The window (3/5/10 s) is a setting in Profile & settings, already in the UI but disabled.

**Why the backend:** `/api/voice-command` currently transcribes, verifies and pays in one request, so the client can't insert a pause.

**Proposed shape:**
- `POST /api/voice-command` runs everything up to the evidence hash, stores a **pending payment** (single-use, expires after ~60 s, bound to vault + amount + recipient + hash), and returns `status: "PENDING"` + `pending_id` + `expires_at` + the TTS line "Paying … in N seconds".
- `POST /api/voice-command/confirm { pending_id }` → signs and sends `execute_guarded_transfer`, then writes the audit row as today.
- `POST /api/voice-command/cancel { pending_id }` → audit row `CANCELLED` (new status: needs `RunStatus` + the `audit_runs` check constraint).
- Fail closed: if confirm never arrives, the pending payment expires and nothing is sent.
- `/api/simulate-rogue` stays immediate (it must reach the chain to prove the guardrail).

**Frontend follow-up once shipped:** countdown card on Speak, then enable the setting.

## 2. Payment notifications (idea, needs decision)

Push on Android needs the Expo push token stored per wallet and a sender triggered on each audit row; email fallback needs an email address (not collected today), a provider and opt-in. Watch out: `audit_runs` is public-read, so don't put contact details there.

## 3. Optional, for later ideas (`docs/IDEAS.md`)

- Global unique @usernames: a table + uniqueness check (the username is device-only today).
- Saved payees: storage + parser support for "Send <name> <amount>".
- Yorùbá: STT language hint, `eleven_v3` TTS test, Yorùbá intent parsing.

## Not needed from backend

App lock (PIN + fingerprint), light/dark, receipts, plain-language activity, presets, and the settings drawer are all frontend-only.
