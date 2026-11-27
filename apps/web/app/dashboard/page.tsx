import { PublicKey } from "@solana/web3.js";

import { Dashboard } from "./_components/dashboard";
import { SolanaProviders } from "./_components/providers";

function validVault(v: string | string[] | undefined): string | null {
  if (typeof v !== "string") return null;
  try {
    return new PublicKey(v).toBase58() === v ? v : null;
  } catch {
    return null;
  }
}

// Web Companion fallback (PRD §8.3). No landing page: `/` redirects here.
export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const readOnlyVault = validVault((await searchParams).vault);
  return (
    <SolanaProviders>
      <Dashboard readOnlyVault={readOnlyVault} />
    </SolanaProviders>
  );
}
