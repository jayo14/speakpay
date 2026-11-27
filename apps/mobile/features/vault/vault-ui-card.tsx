import { lamportsToSol, type VaultState } from '@speakpay/shared'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { appStyles, colors } from '@/constants/app-styles'

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

// Live PolicyVault state (PRD §8.2 Screen 1). All numbers come from the chain read.
export function VaultUiCard({ vault, fundsLamports }: { vault: VaultState; fundsLamports: number }) {
  const now = useNow(1000)
  const windowOpen = now - vault.window_start_ts < 86_400
  const spent = windowOpen ? vault.daily_spent_lamports : 0
  const pct = Math.min(100, (spent / vault.daily_cap_lamports) * 100)
  const cooldownLeft = vault.last_tx_ts === 0 ? 0 : Math.max(0, vault.last_tx_ts + vault.cooldown_secs - now)

  return (
    <View style={appStyles.card}>
      <View style={styles.row}>
        <Text style={appStyles.label}>Vault balance</Text>
        {vault.is_frozen ? <Text style={styles.frozen}>FROZEN</Text> : null}
      </View>
      <Text style={styles.big}>{lamportsToSol(fundsLamports)} SOL</Text>

      <Text style={appStyles.label}>Spent today</Text>
      <Text style={appStyles.mono}>
        {lamportsToSol(spent)} / {lamportsToSol(vault.daily_cap_lamports)} SOL
      </Text>
      <View style={styles.bar}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>

      <View style={styles.row}>
        <View>
          <Text style={appStyles.label}>Max per payment</Text>
          <Text style={appStyles.mono}>{lamportsToSol(vault.max_per_tx_lamports)} SOL</Text>
        </View>
        <View>
          <Text style={appStyles.label}>Cooldown</Text>
          <Text style={appStyles.mono}>{cooldownLeft > 0 ? `${cooldownLeft}s left` : `${vault.cooldown_secs}s · ready`}</Text>
        </View>
        <View>
          <Text style={appStyles.label}>Payments</Text>
          <Text style={appStyles.mono}>{vault.tx_count}</Text>
        </View>
      </View>
      <Text style={appStyles.textMuted}>
        Allowlist: {vault.allowlist.length ? `${vault.allowlist.length} wallet(s)` : 'open (any recipient)'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.line, height: 4 },
  big: { color: colors.ink, fontFamily: 'monospace', fontSize: 32, fontWeight: '700' },
  fill: { backgroundColor: colors.ink, height: 4 },
  frozen: { borderColor: colors.frozen, borderWidth: 1, color: colors.frozen, fontWeight: '700', paddingHorizontal: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
})
