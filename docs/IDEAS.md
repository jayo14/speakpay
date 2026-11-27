# Ideas Backlog (not committed to the hackathon build)

Ideas raised during the UX review. Each needs a feasibility check with the backend developer before it's scheduled. See `docs/PARTNER_HANDOFF.md` for the ones the redesign already depends on.

| Idea | What it means for users | Notes / open questions |
|---|---|---|
| **Yorùbá (and later Hausa, Igbo, Pidgin)** | Choose a language at sign-up or in Settings; screens and spoken replies in Yorùbá; later, Yorùbá voice commands. | ElevenLabs speech-to-text supports Yoruba. Spoken replies likely need the `eleven_v3` voice model (test one call). The command parser is English-only today. Needs a **native-speaker review** of all copy (tone marks ẹ ọ ṣ à á matter). |
| **Saved payees ("Pay a person")** | Save someone once (paste or scan their wallet, name them "Tunde"), then say "Send Tunde 0.02 SOL". Like Starling: after you pay a supplier from an invoice, it **adds them to your contacts** so next time you can pay them by name. It is *not* a receipt. | Needs a contacts list, name + amount parsing, and ties into the on-chain trusted-wallet list (max 5 today). No web page to verify, so it relies on limits + the trusted list. |
| **Notifications for every payment** | A phone notification when money leaves or arrives; **email as a fallback** if push isn't possible. | Push needs device tokens stored server-side; email needs an email address (we decided not to collect one at sign-up), a sending provider and opt-in. |
| **Global @usernames** | A unique handle others can find and pay, like Phantom. | Today the username is device-only. Uniqueness needs a server table. |
| **Activity search & filters** | Find a payment by merchant, amount or date. | Frontend-only; can be done any time. |
| **Monthly spending summary** | "You spent 0.4 SOL this month, mostly on Dev3pack." | Can be computed from `audit_runs`. |
| **Sign in with Google** | Easier sign-up. | Explicitly **not now**. |
