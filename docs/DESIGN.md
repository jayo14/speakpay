# SpeakPay Design System

**Speak to pay.** The product is calm, protective and trustworthy: a guardian for your money that you
talk to. The UI is Phantom-inspired: rounded surfaces, pill navigation, big friendly type and
lavender-on-dark, all in our own plum palette. Web (`apps/web/app/dashboard`) follows this today;
the Android app adopts the same rules next.

## Brand

| Item | Decision |
|---|---|
| Name / tagline | **SpeakPay** · "Speak to pay" · main button: **"Hold to speak"** |
| Logo | **Closing Wave**: a spoken waveform that curls around itself into a coin (Canva concept 02). Source: `apps/web/app/dashboard/_components/logo.tsx` (SVG, uses `currentColor`). App icon: lavender mark on a Royal Plum tile (`apps/web/app/icon.svg`). |
| Font | **Figtree** (free, Google Fonts / `@fontsource-variable/figtree`), close in feel to Phantom's own font, which is proprietary and can't be shipped. Numbers use tabular figures; monospace only for addresses and hashes. |
| Icons | **Lucide**, thin line, 1.75 stroke, never inside circles or boxes (except status icons in tinted rounds). `lucide-react` on web, `lucide-react-native` on Android. |
| Theme | Light and dark **follow the device** by default; Profile & settings has two switches, "Match my device" and "Dark mode", to override it. |
| Avatar | No photos: a soft colour (lavender, mint, ice, butter, blush, lilac) + the username's first letter; a person icon until a username is set. |
| Status marks | One tinted circle with a **bare, bold glyph**: tick (paid), shield ✕ (blocked), **ice cube with the shield inside** (frozen, custom SVG). No circle-in-a-circle. |

## Colour tokens (all text pairs pass WCAG AA)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FAF8FD` | `#0F0A16` | Page |
| `--surface` | `#FFFFFF` | `#1A1324` | Cards |
| `--surface-2` | `#F3EEFC` | `#241B30` | Inputs, inactive pills |
| `--line` | `#E8E2F1` | `#2E2540` | Borders |
| `--text` | `#1A1226` | `#F4F0FA` | Body |
| `--text-muted` | `#6E6480` | `#A89CBC` | Secondary |
| `--primary` / `--primary-text` | Royal Plum `#3D1766` / white | Lavender `#C9B6F2` / `#1B0B2E` | Buttons, mic, active pill |
| `--paid` / `--paid-soft` | Emerald `#0B6B4B` / mint `#DDF5EA` | `#3DBE8B` / 14 % | Paid only |
| `--blocked` / `--blocked-soft` | Flame `#C21F27` / `#FDE4E2` | `#FF5A4E` / 14 % | Blocked, rejected, errors |
| `--frozen` / `--frozen-soft` | Deep ice `#156D91` / ice `#E3F6FD` | Ice `#8FDCF7` / 12 % | Frozen only |

Green, red and ice are **status colours only** and never decoration. Pure ice blue fails contrast as text on white, so in light mode ice is a fill and the deep ice carries text.

Shape: cards 20 px radius, fields 14 px, buttons and pills fully round. Depth: soft plum-tinted shadow in light mode, none in dark mode.

## Navigation (identical names on web and Android)

**Speak · Activity · Vault**, in that order.

- Phone and tablet: avatar (opens the Profile & settings drawer) + pill tabs at the top, like Phantom.
- Desktop (≥ 1024 px): a slim **icon rail** (logo, Speak, Activity, Vault, Settings, Help). Click the rail or logo and it expands smoothly over the content to show labels; click outside or press Esc to close.
- No tutorial: three sections are hard to get lost in, and setup is a guided 3-step flow.

## Screens

| Screen | Contents |
|---|---|
| **First run (web)** | Connect → Profile → Rules → Funds (4 dots). |
| **First run (Android)** | Welcome → Profile → Create PIN (6 digits, confirm) → Fingerprint (optional; skipped if no sensor) → Connect → Rules → Funds (6 dots after Welcome). Later launches open the **lock screen** (fingerprint first if on, PIN always); the app re-locks after 60 s in the background. |
| **Setup 1 · Connect** | Logo, "Speak to pay.", wallet rows (wallet's own icon + chevron), Devnet note. Progress dots. |
| **Setup 2 · Rules** | Presets **Careful / Balanced / Flexible**, each one plain sentence; "Customise" (per payment, per day, wait between payments); "Who can it pay?" (trusted wallet, prefilled with the demo merchant). |
| **Setup 3 · Add funds** | 0.1 / 0.2 / 0.5 SOL chips → wallet approval. |
| **Speak** (home) | Greeting, status strip (balance · spent today bar · Ready / Wait Ns / Frozen / No funds), the **mic orb**, result card with "View receipt", "Try saying" examples. |
| **Activity** | Plain-language rows ("Paid Dev3pack Cloud 0.02 SOL", "Blocked a scam page", "Security test: Rejected by Solana", "Vault frozen") → tap for the **Receipt**. |
| **Receipt** (sheet) | Status icon, title, amount, "Verify on Solana", what you said, what the page showed, paid to, when, Explorer button, collapsed Technical details. Bottom sheet on phones, side sheet on desktop. |
| **Vault** | Balance, Freeze card (turns ice when frozen), Your rules + Edit, Add funds, Withdraw (tap twice to confirm), collapsed **Security test & demo checks** (readiness checklist, hacked-agent simulation, addresses). |
| **Profile & settings** (drawer) | Boxless rows; only the **Wallet** is a card. Avatar + @username + avatar colour, Cancel window 3/5/10 s (*disabled until the backend change*), Security (Android: fingerprint switch, Lock now), Appearance switches, Wallet + Disconnect, Help, About. |

All wording comes from one place: `apps/web/lib/client/describe-run.ts` (tested).

## The mic orb

| State | Look |
|---|---|
| Ready | Plum/lavender circle with a mic, slow breathing ring |
| Listening | Voice waves around the orb that follow the **real microphone volume** (Web Audio meter) |
| Checking | Mic morphs into a **shield** with a thin rotating progress ring |
| Paid / Blocked / Frozen | No colour flood: the orb turns to the surface with a thin status ring and a big bold glyph — tick (emerald) / shield ✕ (flame) / ice cube (ice), ~2.6 s, then back to Ready |

Motion is slow and eased (`cubic-bezier(0.22, 1, 0.36, 1)`, 160–280 ms). Everything stops under `prefers-reduced-motion`.

## Android (built)

Tokens in `constants/theme.ts` (same values as web) via `PrefsProvider`; `userInterfaceStyle: "automatic"`; Figtree via `@expo-google-fonts/figtree`; `lucide-react-native`; top pill tabs + avatar drawer; orb with Reanimated + `expo-audio` metering; 6-digit PIN (salted PBKDF2 in `expo-secure-store`, 5 tries then a 30 s lockout) + optional fingerprint (`expo-local-authentication`). Copy comes from `features/shared/describe-run.ts`, a copy of the web file — keep both identical. All motion uses the same ease (`bezier(0.22, 1, 0.36, 1)`, 160–280 ms).
