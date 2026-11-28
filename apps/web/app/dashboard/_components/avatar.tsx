import { UserRound } from "lucide-react";

// No photos: people pick a soft colour and we show their username's first letter.
export const AVATAR_COLORS = [
  { id: "lavender", bg: "#C9B6F2" },
  { id: "mint", bg: "#BDECD7" },
  { id: "ice", bg: "#BFE9F9" },
  { id: "butter", bg: "#FFF1A8" },
  { id: "blush", bg: "#F7C8D9" },
  { id: "lilac", bg: "#DCD3EE" },
] as const;

export function avatarBg(id: string) {
  return (AVATAR_COLORS.find((c) => c.id === id) ?? AVATAR_COLORS[0]).bg;
}

export function Avatar({ username, color, size = 40 }: { username: string; color: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        alignItems: "center",
        background: avatarBg(color),
        borderRadius: "50%",
        color: "#1B0B2E",
        display: "inline-grid",
        flex: "none",
        fontSize: size * 0.42,
        fontWeight: 700,
        height: size,
        justifyItems: "center",
        width: size,
      }}
    >
      {username ? username.charAt(0).toUpperCase() : <UserRound size={size * 0.5} strokeWidth={1.75} />}
    </span>
  );
}
