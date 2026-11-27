"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { CircleHelp, Mic, ReceiptText, Settings, Shield } from "lucide-react";
import { useCallback, useState } from "react";

import s from "../dashboard.module.css";
import { ActivityView } from "./activity-view";
import { ConnectCard } from "./connect-card";
import { Logo } from "./logo";
import { Avatar, SettingsDrawer } from "./settings-drawer";
import { SpeakView } from "./speak-view";
import { USERNAME_KEY, useLocalSetting } from "./use-local-setting";
import { useVault } from "./use-vault";
import { VaultView } from "./vault-view";

export type Tab = "speak" | "activity" | "vault";

// Same three sections, names and order on web and the Android app.
const TABS: { id: Tab; label: string; Icon: typeof Mic }[] = [
  { id: "speak", label: "Speak", Icon: Mic },
  { id: "activity", label: "Activity", Icon: ReceiptText },
  { id: "vault", label: "Vault", Icon: Shield },
];

export function Dashboard({
  readOnlyVault,
  demoAllowlist,
  initialTab,
}: {
  readOnlyVault: string | null;
  demoAllowlist: string;
  initialTab: Tab;
}) {
  const { publicKey } = useWallet();
  const owner = readOnlyVault ? null : (publicKey?.toBase58() ?? null);
  const vault = useVault(owner);
  const [tab, setTabState] = useState<Tab>(initialTab);
  const [drawer, setDrawer] = useState(false);
  const [username] = useLocalSetting(USERNAME_KEY, "");

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url);
  }, []);

  // Read-only second screen for the demo: /dashboard?vault=<pda>
  if (readOnlyVault) {
    return (
      <div className={s.main}>
        <div className={s.content} style={{ paddingTop: 28 }}>
          <div className={s.row}>
            <Logo size={30} />
            <span className={`${s.muted} ${s.small}`}>Live activity · read only · Devnet</span>
          </div>
          <ActivityView vaultPda={readOnlyVault} />
        </div>
      </div>
    );
  }

  const data = vault.data;
  const setupDone = !!data?.vault && (data.vault_funds_lamports > 0 || data.vault.tx_count > 0);

  let body: React.ReactNode;
  if (!owner) body = <ConnectCard />;
  else if (!data) body = <p className={s.muted}>{vault.error ?? "Reading your vault from Solana…"}</p>;
  else if (tab === "vault" || !setupDone) body = <VaultView data={data} demoAllowlist={demoAllowlist} onChanged={vault.refresh} />;
  else if (tab === "activity") body = <ActivityView vaultPda={data.vault!.vault_pda} />;
  else body = <SpeakView data={data} onGoToVault={() => setTab("vault")} onRun={vault.refresh} owner={owner} username={username} />;

  const activeTab: Tab = owner && data && !setupDone ? "vault" : tab;
  const showNav = !!owner;

  return (
    <div className={s.app}>
      <aside className={s.sidebar}>
        <div className={s.sidebarBrand}>
          <Logo size={30} />
        </div>
        {showNav
          ? TABS.map(({ id, label, Icon }) => (
              <button
                aria-current={activeTab === id ? "page" : undefined}
                className={`${s.navItem} ${activeTab === id ? s.navItemActive : ""}`}
                key={id}
                onClick={() => setTab(id)}
                type="button"
              >
                <Icon size={20} strokeWidth={1.75} />
                {label}
              </button>
            ))
          : null}
        <div className={s.sidebarSpacer} />
        <button className={s.navItem} onClick={() => setDrawer(true)} type="button">
          <Settings size={20} strokeWidth={1.75} />
          Profile &amp; settings
        </button>
        <a className={s.navItem} href="https://github.com/jayo14/speakpay#readme" rel="noreferrer" style={{ textDecoration: "none" }} target="_blank">
          <CircleHelp size={20} strokeWidth={1.75} />
          Help &amp; support
        </a>
      </aside>

      <main className={s.main}>
        <header className={s.topbar}>
          <button aria-label="Profile and settings" className={s.avatar} onClick={() => setDrawer(true)} type="button">
            <Avatar username={username} />
          </button>
          {showNav ? (
            <nav aria-label="Sections" className={s.pills}>
              {TABS.map(({ id, label }) => (
                <button
                  aria-current={activeTab === id ? "page" : undefined}
                  className={`${s.pill} ${activeTab === id ? s.pillActive : ""}`}
                  key={id}
                  onClick={() => setTab(id)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </nav>
          ) : (
            <Logo size={26} />
          )}
        </header>
        {body}
      </main>

      {drawer ? <SettingsDrawer onClose={() => setDrawer(false)} /> : null}
    </div>
  );
}
