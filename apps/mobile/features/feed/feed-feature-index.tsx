import { explorerTxUrl, lamportsToSol, type AuditRunRow } from '@speakpay/shared'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import * as WebBrowser from 'expo-web-browser'
import { Pressable, Text, View } from 'react-native'
import { appStyles, colors } from '@/constants/app-styles'
import { StatusChip } from '@/features/console/status-chip'
import { VerifyBadge } from '@/features/console/verify-badge'
import { useAuditFeed } from '@/features/feed/use-audit-feed'
import { useVault } from '@/features/vault/use-vault'
import { ellipsify } from '@/utils/ellipsify'

function Row({ run }: { run: AuditRunRow }) {
  const time = new Date(run.created_at).toLocaleTimeString()
  return (
    <View style={[appStyles.card, { gap: 4 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <StatusChip status={run.status} />
        <Text style={appStyles.textMuted}>
          {run.kind} · {time}
        </Text>
      </View>
      {run.transcript ? <Text style={appStyles.text}>“{run.transcript}”</Text> : null}
      {run.amount_lamports !== null ? <Text style={appStyles.mono}>{lamportsToSol(run.amount_lamports)} SOL</Text> : null}
      {run.error_code ? <Text style={appStyles.mono}>{run.error_code}</Text> : null}
      {run.evidence_hash ? <Text style={appStyles.mono}>hash {ellipsify(run.evidence_hash, 6)}</Text> : null}
      {run.status === 'PASSED' && run.kind === 'voice' ? <VerifyBadge runId={run.id} /> : null}
      {run.tx_signature ? (
        <Pressable onPress={() => void WebBrowser.openBrowserAsync(explorerTxUrl(run.tx_signature!))}>
          <Text style={appStyles.mono}>tx {ellipsify(run.tx_signature, 6)} ↗</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

// Live audit feed for the connected owner's vault (PRD §8.2 Screen 3).
export function FeedFeatureIndex() {
  const { account } = useMobileWallet()
  const vault = useVault(account?.address.toBase58()).data?.vault ?? null
  const feed = useAuditFeed(vault?.vault_pda ?? null)

  if (!account) return <Text style={appStyles.textMuted}>Connect a wallet on the Vault tab.</Text>
  if (!vault) return <Text style={appStyles.textMuted}>No vault yet — create one on the Vault tab.</Text>

  return (
    <View style={appStyles.stack}>
      <Text style={{ color: feed.live ? colors.pass : colors.inkMuted }}>{feed.live ? '● Live' : '○ Connecting…'}</Text>
      {feed.error ? <Text style={appStyles.textDanger}>{feed.error}</Text> : null}
      {feed.rows.length === 0 && !feed.error ? (
        <Text style={appStyles.textMuted}>No runs yet. Hold to speak on the Speak tab.</Text>
      ) : null}
      <Text style={appStyles.textMuted}>Voice transcripts are stored publicly for this Devnet demo.</Text>
      {feed.rows.map((r) => (
        <Row key={r.id} run={r} />
      ))}
    </View>
  )
}
