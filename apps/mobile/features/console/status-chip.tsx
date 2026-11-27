import type { RunStatus } from '@speakpay/shared'
import { Text } from 'react-native'
import { colors } from '@/constants/app-styles'

const TONE: Record<RunStatus, string> = {
  PASSED: colors.pass,
  INJECTION_BLOCKED: colors.block,
  ONCHAIN_REJECTED: colors.block,
  PRECHECK_FAILED: colors.block,
  ERROR: colors.block,
  FROZEN: colors.frozen,
  FREEZE_REQUESTED: colors.frozen,
}

export function StatusChip({ status }: { status: RunStatus }) {
  const c = TONE[status]
  return (
    <Text style={{ alignSelf: 'flex-start', borderColor: c, borderWidth: 1, color: c, fontWeight: '700', paddingHorizontal: 8 }}>
      {status.replace(/_/g, ' ')}
    </Text>
  )
}
