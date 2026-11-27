import "server-only";

import { requireEnv } from "./env";

// ElevenLabs REST only (PRD §5.1/§5.2, AGENTS.md §5.3). No WebRTC, no websockets.

const BASE = "https://api.elevenlabs.io/v1";

export const STT_KEYTERMS = [
  "Solana",
  "Devnet",
  "SOL",
  "freeze",
  "vault",
  "SpeakPay",
  "Dev3pack",
  "Starter Plan",
  "Shady Deals",
] as const;

export class ElevenLabsError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

/** POST /v1/speech-to-text (multipart). Returns the exact transcript text. */
export async function transcribe(audio: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model_id", requireEnv("ELEVENLABS_STT_MODEL_ID")); // default scribe_v3
  form.append("language_code", "en");
  for (const term of STT_KEYTERMS) form.append("keyterms", term);

  let res: Response;
  try {
    res = await fetch(`${BASE}/speech-to-text`, {
      method: "POST",
      headers: { "xi-api-key": requireEnv("ELEVENLABS_API_KEY") },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new ElevenLabsError(timedOut ? "STT_TIMEOUT" : "STT_NETWORK", "Speech-to-text request failed");
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new ElevenLabsError(`STT_${res.status}`, `ElevenLabs STT ${res.status}: ${detail}`);
  }
  const body = (await res.json()) as { text?: unknown };
  return typeof body.text === "string" ? body.text.trim() : "";
}

/**
 * POST /v1/text-to-speech/{voice_id}. Returns base64 MP3, or null on any failure:
 * TTS never fails a run (PRD §5.2) — clients show the text instead.
 */
export async function speak(text: string): Promise<string | null> {
  try {
    const voice = encodeURIComponent(requireEnv("ELEVENLABS_VOICE_ID"));
    const res = await fetch(`${BASE}/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: {
        "xi-api-key": requireEnv("ELEVENLABS_API_KEY"),
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text, model_id: requireEnv("ELEVENLABS_TTS_MODEL_ID") }), // default eleven_flash_v2_5
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`ElevenLabs TTS ${res.status}`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch (e) {
    console.error("ElevenLabs TTS failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
