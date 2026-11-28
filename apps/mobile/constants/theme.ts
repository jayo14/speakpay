// SpeakPay tokens — identical values to apps/web/app/globals.css (docs/DESIGN.md).

export const palettes = {
  light: {
    bg: '#FAF8FD',
    surface: '#FFFFFF',
    surface2: '#F3EEFC',
    surface3: '#EBE4F7',
    line: '#E8E2F1',
    overlay: 'rgba(15,10,22,0.45)',
    text: '#1A1226',
    textMuted: '#6E6480',
    primary: '#3D1766',
    primaryText: '#FFFFFF',
    primarySoft: '#ECE4F8',
    paid: '#0B6B4B',
    paidSoft: '#DDF5EA',
    blocked: '#C21F27',
    blockedSoft: '#FDE4E2',
    frozen: '#156D91',
    frozenSoft: '#E3F6FD',
    shadow: 'rgba(61,23,102,0.10)',
  },
  dark: {
    bg: '#0F0A16',
    surface: '#1A1324',
    surface2: '#241B30',
    surface3: '#2E2540',
    line: '#2E2540',
    overlay: 'rgba(0,0,0,0.6)',
    text: '#F4F0FA',
    textMuted: '#A89CBC',
    primary: '#C9B6F2',
    primaryText: '#1B0B2E',
    primarySoft: '#2C2140',
    paid: '#3DBE8B',
    paidSoft: 'rgba(61,190,139,0.14)',
    blocked: '#FF5A4E',
    blockedSoft: 'rgba(255,90,78,0.14)',
    frozen: '#8FDCF7',
    frozenSoft: 'rgba(143,220,247,0.12)',
    shadow: 'rgba(0,0,0,0)',
  },
} as const

export type Palette = { [K in keyof (typeof palettes)['light']]: string }

export const fonts = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
} as const

export const radius = { card: 20, field: 14, pill: 999 } as const

/** Motion: eased, 160–280 ms, never bouncy. */
export const motion = { fast: 160, med: 280 } as const

export const AVATAR_COLORS = [
  { id: 'lavender', bg: '#C9B6F2' },
  { id: 'mint', bg: '#BDECD7' },
  { id: 'ice', bg: '#BFE9F9' },
  { id: 'butter', bg: '#FFF1A8' },
  { id: 'blush', bg: '#F7C8D9' },
  { id: 'lilac', bg: '#DCD3EE' },
] as const

export function avatarBg(id: string) {
  return (AVATAR_COLORS.find((c) => c.id === id) ?? AVATAR_COLORS[0]).bg
}
