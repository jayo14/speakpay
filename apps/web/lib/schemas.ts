import { PublicKey } from "@solana/web3.js";
import { MAX_ALLOWLIST } from "@speakpay/shared";
import { z } from "zod";

export const pubkey = z.string().refine((s) => {
  try {
    return new PublicKey(s).toBase58() === s;
  } catch {
    return false;
  }
}, "must be a base58 Solana public key");

export const signature = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/, "must be a base58 transaction signature");

export const lamports = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const client = z.enum(["mobile", "web", "api"]);

const policyParams = z.object({
  max_per_tx_lamports: lamports.positive(),
  daily_cap_lamports: lamports.positive(),
  cooldown_secs: z.number().int().nonnegative(),
  allowlist: z.array(pubkey).max(MAX_ALLOWLIST),
});

export const ownerAction = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("init"),
    owner_pubkey: pubkey,
    params: policyParams.extend({ agent_delegate: pubkey.optional() }),
  }),
  z.object({
    action: z.literal("deposit"),
    owner_pubkey: pubkey,
    params: z.object({ amount_lamports: lamports.positive() }),
  }),
  z.object({
    action: z.literal("update_policy"),
    owner_pubkey: pubkey,
    params: policyParams.extend({ agent_delegate: pubkey }),
  }),
  z.object({
    action: z.literal("toggle_freeze"),
    owner_pubkey: pubkey,
    params: z.object({ frozen: z.boolean() }),
  }),
  z.object({
    action: z.literal("withdraw_all"),
    owner_pubkey: pubkey,
    params: z.object({}).optional(),
  }),
]);
