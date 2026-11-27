import type { AuditVerifyResponse } from '@speakpay/shared'
import { useMutation } from '@tanstack/react-query'
import { Pressable, Text } from 'react-native'
import { appStyles, colors } from '@/constants/app-styles'
import { apiGet } from '@/features/api/api-client'
import { formatError } from '@/utils/format-error'

// T3: recompute the receipt hash server-side and compare it with the on-chain ExecutionAudited event.
export function VerifyBadge({ runId }: { runId: string }) {
  const verify = useMutation({ mutationFn: () => apiGet<AuditVerifyResponse>(`/api/audit/verify/${runId}`) })
  if (!runId) return null
  if (verify.data) {
    const ok = verify.data.match
    return (
      <Text style={{ color: ok ? colors.pass : colors.block, fontWeight: '700' }}>
        {ok ? '✓ Evidence hash matches Solana' : '✗ Hash mismatch'} ({verify.data.source})
      </Text>
    )
  }
  return (
    <Pressable disabled={verify.isPending} onPress={() => verify.mutate()}>
      <Text style={[appStyles.mono, { textDecorationLine: 'underline' }]}>
        {verify.isPending ? 'Verifying…' : 'Verify evidence on-chain'}
      </Text>
      {verify.isError ? <Text style={appStyles.textDanger}>{formatError(verify.error)}</Text> : null}
    </Pressable>
  )
}
