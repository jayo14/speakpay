import { PublicKey } from "@solana/web3.js";

import { Dashboard, type Tab } from "./_components/dashboard";
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
const TABS: readonly Tab[] = ["speak", "activity", "vault"];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const readOnlyVault = validVault(params.vault);
  const initialTab = TABS.find((t) => t === params.tab) ?? "speak";
  // Public merchant address for the demo allowlist prefill (PRD §2); never a secret.
  const demoAllowlist = validVault(process.env.MERCHANT_CLEAN_WALLET?.trim()) ?? "";
  return (
    <SolanaProviders>
      <Dashboard demoAllowlist={demoAllowlist} initialTab={initialTab} readOnlyVault={readOnlyVault} />
    </SolanaProviders>
  );
}
