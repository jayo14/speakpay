import type { AuditVerifyResponse } from '@speakpay/shared'
import { useMutation } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react-native'
import { View } from 'react-native'
import { TonePill } from '@/components/tone-icon'
import { Button, ErrorText } from '@/components/ui'
import { apiGet } from '@/features/api/api-client'
import { usePalette } from '@/features/prefs/prefs-provider'
import { formatError } from '@/utils/format-error'

// T3: the server recomputes the receipt hash and compares it with the on-chain ExecutionAudited event.
export function VerifyBadge({ runId }: { runId: string }) {
  const p = usePalette()
  const verify = useMutation({ mutationFn: () => apiGet<AuditVerifyResponse>(`/api/audit/verify/${runId}`) })
  if (!runId) return null
  if (verify.data) return <TonePill label={verify.data.match ? '✓ Verified on Solana' : 'Hash mismatch'} tone={verify.data.match ? 'paid' : 'blocked'} />
  return (
    <View style={{ gap: 6 }}>
      <Button busy={verify.isPending} icon={<ShieldCheck color={p.text} size={16} strokeWidth={1.75} />} onPress={() => verify.mutate()} small title="Verify on Solana" variant="secondary" />
      {verify.isError ? <ErrorText>{formatError(verify.error)}</ErrorText> : null}
    </View>
  )
}
