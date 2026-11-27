import type { AuditRunRow } from '@speakpay/shared'
import { useEffect, useState } from 'react'
import { supabase } from '@/features/activity/supabase'

const LIMIT = 50

/** Last 50 audit_runs for the vault, then live INSERTs via Supabase Realtime (PRD §8.2 Screen 3). */
export function useAuditFeed(vaultPda: string | null) {
  const [rows, setRows] = useState<AuditRunRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    if (!vaultPda) return
    let cancelled = false

    void supabase
      .from('audit_runs')
      .select('*')
      .eq('vault_pda', vaultPda)
      .order('created_at', { ascending: false })
      .limit(LIMIT)
      .then(({ data, error: e }) => {
        if (cancelled) return
        if (e) setError(e.message)
        else setRows((data ?? []) as AuditRunRow[])
      })

    const channel = supabase
      .channel(`audit_runs:${vaultPda}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_runs', filter: `vault_pda=eq.${vaultPda}` },
        (payload) => {
          const row = payload.new as AuditRunRow
          setRows((prev) => (prev.some((r) => r.id === row.id) ? prev : [row, ...prev].slice(0, LIMIT)))
        },
      )
      .subscribe((status) => setLive(status === 'SUBSCRIBED'))

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [vaultPda])

  return { rows, error, live }
}
