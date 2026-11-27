"use client";

import { useCallback, useSyncExternalStore } from "react";

import { THEME_KEY, useLocalSetting } from "./use-local-setting";

export type ThemePref = "system" | "light" | "dark";

function subscribeScheme(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** Theme preference (device by default) + the effective light/dark mode. */
export function useTheme() {
  const [raw, setRaw] = useLocalSetting(THEME_KEY, "system");
  const pref: ThemePref = raw === "light" || raw === "dark" ? raw : "system";
  const deviceDark = useSyncExternalStore(
    subscribeScheme,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
  const setPref = useCallback(
    (p: ThemePref) => {
      setRaw(p);
      const root = document.documentElement;
      if (p === "system") delete root.dataset.theme;
      else root.dataset.theme = p;
    },
    [setRaw],
  );
  return { pref, dark: pref === "system" ? deviceDark : pref === "dark", setPref };
}
