import { pbkdf2 } from '@noble/hashes/pbkdf2'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import * as SecureStore from 'expo-secure-store'

// 6-digit app-lock PIN: salted PBKDF2-SHA256 in the Android keystore (expo-secure-store).
// It locks the app on this phone; moving vault money still needs the wallet's signature.

const PIN_KEY = 'speakpay.pin.v1'
const ATTEMPTS_KEY = 'speakpay.pin.attempts'
const ITERATIONS = 20_000
export const PIN_LENGTH = 6
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 30_000

interface Stored {
  salt: string
  hash: string
}

function derive(pin: string, salt: Uint8Array) {
  return bytesToHex(pbkdf2(sha256, pin, salt, { c: ITERATIONS, dkLen: 32 }))
}

export async function hasPin() {
  return (await SecureStore.getItemAsync(PIN_KEY)) !== null
}

export async function savePin(pin: string) {
  if (!/^\d{6}$/.test(pin)) throw new Error('PIN must be 6 digits')
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  const stored: Stored = { salt: bytesToHex(salt), hash: derive(pin, salt) }
  await SecureStore.setItemAsync(PIN_KEY, JSON.stringify(stored))
  await SecureStore.deleteItemAsync(ATTEMPTS_KEY)
}

export type PinCheck = { ok: true } | { ok: false; lockedForMs: number; attemptsLeft: number }

export async function checkPin(pin: string): Promise<PinCheck> {
  const raw = await SecureStore.getItemAsync(PIN_KEY)
  if (!raw) return { ok: false, lockedForMs: 0, attemptsLeft: 0 }
  const attempts = JSON.parse((await SecureStore.getItemAsync(ATTEMPTS_KEY)) ?? '{"n":0,"until":0}') as { n: number; until: number }
  const now = Date.now()
  if (attempts.until > now) return { ok: false, lockedForMs: attempts.until - now, attemptsLeft: 0 }

  const stored = JSON.parse(raw) as Stored
  // Constant-time-ish compare over equal-length hex strings.
  const candidate = derive(pin, hexToBytes(stored.salt))
  let diff = candidate.length ^ stored.hash.length
  for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ stored.hash.charCodeAt(i)
  if (diff === 0) {
    await SecureStore.deleteItemAsync(ATTEMPTS_KEY)
    return { ok: true }
  }
  const n = attempts.n + 1
  const until = n >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0
  await SecureStore.setItemAsync(ATTEMPTS_KEY, JSON.stringify({ n: until ? 0 : n, until }))
  return { ok: false, lockedForMs: until ? LOCKOUT_MS : 0, attemptsLeft: until ? 0 : MAX_ATTEMPTS - n }
}

export async function clearPin() {
  await SecureStore.deleteItemAsync(PIN_KEY)
  await SecureStore.deleteItemAsync(ATTEMPTS_KEY)
}
