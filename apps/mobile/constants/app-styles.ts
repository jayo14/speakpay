import { StyleSheet } from 'react-native'

// Swiss / monochrome tokens — PRD §8.1. No gradients, shadows or radii.
export const colors = {
  bg: '#FFFFFF',
  ink: '#0A0A0A',
  inkMuted: 'rgba(10, 10, 10, 0.5)',
  line: '#E5E5E5',
  pass: '#0A7D32',
  block: '#C21807',
  frozen: '#1F4FD1',
} as const

export const mono = 'monospace'
const unit = 8

export const appStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderColor: colors.line,
    borderWidth: 1,
    gap: unit,
    padding: unit * 2,
  },
  label: {
    color: colors.inkMuted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  mono: {
    color: colors.ink,
    fontFamily: mono,
  },
  screen: {
    backgroundColor: colors.bg,
    flex: 1,
    gap: unit * 2,
    paddingHorizontal: unit * 2,
    paddingTop: unit * 2,
  },
  stack: {
    gap: unit,
  },
  text: {
    color: colors.ink,
  },
  textDanger: {
    color: colors.block,
  },
  textMuted: {
    color: colors.inkMuted,
  },
  textSuccess: {
    color: colors.pass,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '700',
  },
})
