import type { HealthResponse } from "@speakpay/shared";
import { NextResponse } from "next/server";

import { missingEnv } from "@/lib/env";
import { agentDelegate, connection, programId } from "@/lib/solana";
import { withTimeout } from "@/lib/timeout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liveness of env, RPC, program and delegate. Never returns secret values.
export async function GET() {
  const env_missing = missingEnv();
  const res: HealthResponse = {
    ok: false,
    rpc_ok: false,
    program_deployed: false,
    delegate_balance_lamports: null,
    env_missing,
  };

  try {
    await withTimeout(connection().getVersion(), 5_000, "rpc getVersion");
    res.rpc_ok = true;
  } catch {
    // rpc_ok stays false
  }

  if (res.rpc_ok) {
    try {
      const info = await withTimeout(connection().getAccountInfo(programId()), 5_000, "program lookup");
      res.program_deployed = info?.executable === true;
    } catch {
      // program_deployed stays false
    }
    try {
      res.delegate_balance_lamports = await withTimeout(
        connection().getBalance(agentDelegate().publicKey),
        5_000,
        "delegate balance",
      );
    } catch {
      // delegate_balance_lamports stays null
    }
  }

  res.ok = env_missing.length === 0 && res.rpc_ok && res.program_deployed && res.delegate_balance_lamports !== null;
  return NextResponse.json(res, { status: res.ok ? 200 : 503 });
}
