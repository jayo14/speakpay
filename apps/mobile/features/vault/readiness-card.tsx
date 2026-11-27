import { PublicKey } from '@solana/web3.js'
import { demoReadiness, type VaultReadResponse } from '@speakpay/shared'
import { useQuery } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { CircleCheck, CircleX } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { TonePill } from '@/components/tone-icon'
import { Row, Txt } from '@/components/ui'
import { usePalette } from '@/features/prefs/prefs-provider'

// Pre-demo reset checklist (PRD §2), live from chain. All green = ready to record a take.
export function ReadinessCard({ data }: { data: VaultReadResponse }) {
  const p = usePalette()
  const { connection } = useMobileWallet()
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])
  const delegate = useQuery({
    queryKey: ['balance', data.delegate_pubkey],
    queryFn: () => connection.getBalance(new PublicKey(data.delegate_pubkey)),
    refetchInterval: 30_000,
  })
  if (!data.vault) return null
  const checks = demoReadiness(data.vault, data.vault_funds_lamports, delegate.data ?? null, now)
  const ready = checks.every((c) => c.ok)

  return (
    <View style={{ gap: 10 }}>
      <TonePill label={ready ? 'Demo ready' : 'Not demo ready yet'} tone={ready ? 'paid' : 'blocked'} />
      {checks.map((c) => (
        <Row key={c.id}>
          <View style={{ alignItems: 'center', flex: 1, flexDirection: 'row', gap: 8 }}>
            {c.ok ? <CircleCheck color={p.paid} size={16} strokeWidth={2} /> : <CircleX color={p.blocked} size={16} strokeWidth={2} />}
            <Txt style={{ flexShrink: 1 }}>{c.label}</Txt>
          </View>
          <Txt variant="small">{c.detail}</Txt>
        </Row>
      ))}
    </View>
  )
}
