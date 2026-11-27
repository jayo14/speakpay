import type { ApiError } from '@speakpay/shared'
import { AppConfig } from '@/constants/app-config'

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

async function handle<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as unknown
  if (!res.ok) {
    const err = (body as ApiError | null)?.error
    throw new ApiClientError(res.status, err?.code ?? `HTTP_${res.status}`, err?.message ?? `Request failed (${res.status})`)
  }
  return body as T
}

const url = (path: string) => `${AppConfig.apiBaseUrl.replace(/\/$/, '')}${path}`

export async function apiGet<T>(path: string): Promise<T> {
  return handle<T>(await fetch(url(path)))
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return handle<T>(
    await fetch(url(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  )
}

/** Multipart upload of a local recording (React Native file object form). */
export async function apiPostAudio<T>(path: string, fileUri: string, fields: Record<string, string>): Promise<T> {
  const form = new FormData()
  // React Native's FormData accepts { uri, name, type } for local files.
  form.append('audio', { uri: fileUri, name: 'command.m4a', type: 'audio/m4a' } as unknown as Blob)
  for (const [k, v] of Object.entries(fields)) form.append(k, v)
  return handle<T>(await fetch(url(path), { method: 'POST', body: form }))
}
