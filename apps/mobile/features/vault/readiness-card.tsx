import { PublicKey } from '@solana/web3.js'
import { demoReadiness, type VaultReadResponse } from '@speakpay/shared'
import { useQuery } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { appStyles, colors } from '@/constants/app-styles'

// Pre-demo reset checklist (PRD §2), live from chain. All green = ready to record a take.
export function ReadinessCard({ data }: { data: VaultReadResponse }) {
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
    <View style={appStyles.card}>
      <Text style={[appStyles.label, { color: ready ? colors.pass : colors.block }]}>
        {ready ? 'Demo ready' : 'Not demo ready'}
      </Text>
      {checks.map((c) => (
        <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ color: c.ok ? colors.pass : colors.block, flexShrink: 1 }}>
            {c.ok ? '✓' : '✗'} {c.label}
          </Text>
          <Text style={appStyles.textMuted}>{c.detail}</Text>
        </View>
      ))}
    </View>
  )
}
