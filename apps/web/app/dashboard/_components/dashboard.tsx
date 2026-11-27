"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { CircleHelp, Mic, ReceiptText, Settings, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import s from "../dashboard.module.css";
import { ActivityView } from "./activity-view";
import { Avatar } from "./avatar";
import { ConnectCard } from "./connect-card";
import { Logo, LogoMark } from "./logo";
import { ProfileStep } from "./profile-step";
import { SettingsDrawer } from "./settings-drawer";
import { SpeakView } from "./speak-view";
import { AVATAR_KEY, PROFILE_DONE_KEY, USERNAME_KEY, useLocalSetting } from "./use-local-setting";
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
  const [railOpen, setRailOpen] = useState(false);
  const [username] = useLocalSetting(USERNAME_KEY, "");
  const [avatar] = useLocalSetting(AVATAR_KEY, "lavender");
  const [profileDone] = useLocalSetting(PROFILE_DONE_KEY, "");

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    setRailOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    if (!railOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setRailOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [railOpen]);

  // Read-only second screen for the demo: /dashboard?vault=<pda>
  if (readOnlyVault) {
    return (
      <div className={s.main} style={{ marginLeft: 0 }}>
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
  const inSetup = !owner || profileDone !== "1" || (!!data && !setupDone);

  // First-run flow: Connect → Profile → Rules → Funds, then the three sections.
  let body: React.ReactNode;
  if (!owner) body = <ConnectCard />;
  else if (profileDone !== "1") body = <ProfileStep />;
  else if (!data) body = <p className={s.muted}>{vault.error ?? "Reading your vault from Solana…"}</p>;
  else if (tab === "vault" || !setupDone) body = <VaultView data={data} demoAllowlist={demoAllowlist} onChanged={vault.refresh} />;
  else if (tab === "activity") body = <ActivityView vaultPda={data.vault!.vault_pda} />;
  else body = <SpeakView data={data} onGoToVault={() => setTab("vault")} onRun={vault.refresh} owner={owner} username={username} />;

  const activeTab: Tab = inSetup ? "vault" : tab;
  const showNav = !inSetup;

  return (
    <div className={s.app}>
      {/* Desktop icon rail: click the rail (or the logo) to expand; click outside or press Esc to close. */}
      {railOpen ? <div aria-hidden className={s.railScrim} onClick={() => setRailOpen(false)} /> : null}
      <aside
        aria-label="Main menu"
        className={`${s.rail} ${railOpen ? s.railOpen : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setRailOpen((o) => !o);
        }}
      >
        <button aria-expanded={railOpen} aria-label={railOpen ? "Collapse menu" : "Expand menu"} className={s.railBrand} onClick={() => setRailOpen((o) => !o)} type="button">
          <span className={s.railIcon} style={{ color: "var(--primary)" }}>
            <LogoMark size={30} />
          </span>
          <span className={s.railLabel} style={{ fontSize: 19, fontWeight: 700, color: "var(--text)" }}>
            SpeakPay
          </span>
        </button>
        {showNav
          ? TABS.map(({ id, label, Icon }) => (
              <button
                aria-current={activeTab === id ? "page" : undefined}
                className={`${s.navItem} ${activeTab === id ? s.navItemActive : ""}`}
                key={id}
                onClick={() => setTab(id)}
                title={railOpen ? undefined : label}
                type="button"
              >
                <span className={s.railIcon}>
                  <Icon size={22} strokeWidth={1.75} />
                </span>
                <span className={s.railLabel}>{label}</span>
              </button>
            ))
          : null}
        <div className={s.sidebarSpacer} onClick={() => setRailOpen((o) => !o)} />
        <button
          className={s.navItem}
          onClick={() => {
            setRailOpen(false);
            setDrawer(true);
          }}
          title={railOpen ? undefined : "Profile & settings"}
          type="button"
        >
          <span className={s.railIcon}>
            <Settings size={22} strokeWidth={1.75} />
          </span>
          <span className={s.railLabel}>Profile &amp; settings</span>
        </button>
        <a
          className={s.navItem}
          href="https://github.com/jayo14/speakpay#readme"
          rel="noreferrer"
          style={{ textDecoration: "none" }}
          target="_blank"
          title={railOpen ? undefined : "Help & support"}
        >
          <span className={s.railIcon}>
            <CircleHelp size={22} strokeWidth={1.75} />
          </span>
          <span className={s.railLabel}>Help &amp; support</span>
        </a>
      </aside>

      <main className={s.main}>
        <header className={s.topbar}>
          <button aria-label="Profile and settings" className={s.avatarBtn} onClick={() => setDrawer(true)} type="button">
            <Avatar color={avatar} size={40} username={username} />
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
        <div className={s.view} key={inSetup ? `setup:${!owner}:${profileDone}:${!!data?.vault}` : activeTab}>
          {body}
        </div>
      </main>

      {drawer ? <SettingsDrawer onClose={() => setDrawer(false)} /> : null}
    </div>
  );
}
