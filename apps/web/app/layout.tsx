import "@fontsource-variable/figtree";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "SpeakPay — Speak to pay",
  description: "Speak to pay, inside spending limits no AI can break.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8fd" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0a16" },
  ],
};

// Applies a saved Light/Dark choice before first paint (no flash). "system" = follow the device.
const THEME_BOOT = `try{var t=localStorage.getItem("speakpay.theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
