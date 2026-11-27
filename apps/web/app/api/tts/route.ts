import type { TtsResponse } from "@speakpay/shared";
import { NextResponse } from "next/server";
import { z } from "zod";

import { speak } from "@/lib/elevenlabs";
import { errorResponse, parseJson } from "@/lib/http";

export const runtime = "nodejs";

const body = z.object({ text: z.string().trim().min(1).max(200) });

// Speaks a client-side verdict through ElevenLabs TTS (PRD §6.4).
export async function POST(req: Request) {
  try {
    const { text } = await parseJson(req, body);
    const res: TtsResponse = { tts_audio_base64: await speak(text) };
    return NextResponse.json(res);
  } catch (e) {
    return errorResponse(e);
  }
}
