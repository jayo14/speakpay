"use client";

import { useCallback, useSyncExternalStore } from "react";

// Per-device preferences (username, cancel window). Stored locally only — never sent to the server.
const EVENT = "speakpay-setting";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function useLocalSetting(key: string, fallback: string): [string, (v: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key) ?? fallback,
    () => fallback,
  );
  const set = useCallback(
    (v: string) => {
      try {
        window.localStorage.setItem(key, v);
      } catch {
        // storage unavailable (private mode): the value just won't persist
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, set];
}

export const USERNAME_KEY = "speakpay.username";
export const CANCEL_WINDOW_KEY = "speakpay.cancelWindowSecs";
export const AVATAR_KEY = "speakpay.avatar";
export const PROFILE_DONE_KEY = "speakpay.profileDone";
export const THEME_KEY = "speakpay.theme"; // "system" | "light" | "dark"
