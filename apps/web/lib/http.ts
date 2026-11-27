import "server-only";

import type { ApiError } from "@speakpay/shared";
import { NextResponse } from "next/server";
import { z } from "zod";

import { MissingEnvError } from "./env";
import { TimeoutError } from "./timeout";

/** PRD §6 error envelope. Policy outcomes are NOT errors — they return 200 with a status. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorResponse(e: unknown): NextResponse<ApiError> {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  }
  if (e instanceof z.ZodError) {
    const message = e.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    return NextResponse.json({ error: { code: "BAD_REQUEST", message } }, { status: 400 });
  }
  if (e instanceof MissingEnvError) {
    // Name of the variable only, never a value.
    return NextResponse.json({ error: { code: "SERVER_MISCONFIGURED", message: e.message } }, { status: 500 });
  }
  if (e instanceof TimeoutError) {
    return NextResponse.json({ error: { code: "UPSTREAM_TIMEOUT", message: e.message } }, { status: 504 });
  }
  console.error(e);
  return NextResponse.json({ error: { code: "INTERNAL", message: "Unexpected server error" } }, { status: 500 });
}

export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "BAD_REQUEST", "Body must be JSON");
  }
  return schema.parse(body);
}
