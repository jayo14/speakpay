"use client";

/** Plays a base64 MP3 from the API (ElevenLabs TTS). */
export function playTts(base64: string | null) {
  if (!base64) return;
  void new Audio(`data:audio/mpeg;base64,${base64}`).play().catch(() => undefined);
}
