"use client";

import type { ApiError } from "@speakpay/shared";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function handle<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const err = (body as ApiError | null)?.error;
    throw new ApiClientError(res.status, err?.code ?? `HTTP_${res.status}`, err?.message ?? `Request failed (${res.status})`);
  }
  return body as T;
}

// Same-origin: the dashboard and the API are one Next.js deployment (PRD D5).
export const apiGet = async <T,>(path: string) => handle<T>(await fetch(path, { cache: "no-store" }));

export const apiPost = async <T,>(path: string, body: unknown) =>
  handle<T>(await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

export const apiPostForm = async <T,>(path: string, form: FormData) => handle<T>(await fetch(path, { method: "POST", body: form }));

export function errorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === "string" ? e : "Unknown error";
}
