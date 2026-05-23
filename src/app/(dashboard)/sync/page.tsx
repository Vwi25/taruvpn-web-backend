import { Flame, Snowflake, RefreshCw, ArrowRight } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { createAdminClient } from '@/lib/supabase/server'
import { formatDate, formatDuration, formatNumber, formatRelative } from '@/lib/format'

export const dynamic = 'force-dynamic'

interface SyncStatus {
  tier: string
  last_run_started_at: string | null
  last_run_finished_at: string | null
  last_run_duration_ms: number | null
  last_run_status: string | null
  last_run_rows_synced: number | null
  last_run_error: string | null
}

const TIER_META: Record<string, { icon: typeof Flame; label: string; description: string }> = {
  hot: {
    icon: Flame,
    label: 'Hot tier',
    description: 'Live state — node health, WG handshakes, current connections. Target cadence: 30s.',
  },
  warm: {
    icon: RefreshCw,
    label: 'Warm tier',
    description: 'Customer + device CRUD + recent events. Target cadence: 5m.',
  },
  cold: {
    icon: Snowflake,
    label: 'Cold tier',
    description: 'Metrics CSV archival. Phase 2 deferred — currently never run.',
  },
  migrate: {
    icon: ArrowRight,
    label: 'Migrations',
    description: 'Schema migrations applied via migrate.py. Runs on demand.',
  },
}

export default async function SyncPage() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('internal')
    .from('vpn_sync_status')
    .select('tier, last_run_started_at, last_run_finished_at, last_run_duration_ms, last_run_status, last_run_rows_synced, last_run_error')
    .order('tier')

  const statuses = (data ?? []) as SyncStatus[]

  return (
    <>
      <PageHeader
        title="Sync status"
        description="taruvpn-db-connector self-reports per-tier sync state. Stale data here = systemd timer not running or recent failure."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {statuses.map((s) => {
          const meta = TIER_META[s.tier] ?? { icon: RefreshCw, label: s.tier, description: '' }
          const Icon = meta.icon
          return (
            <Card key={s.tier}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {meta.label}
                  </span>
                  <StatusBadge status={s.last_run_status ?? 'never'} />
                </CardTitle>
                <p className="text-xs text-muted-foreground">{meta.description}</p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-muted-foreground">Last finished</span>
                  {s.last_run_finished_at ? (
                    <Tooltip>
                      <TooltipTrigger className="text-left font-mono">
                        {formatRelative(s.last_run_finished_at)}
                      </TooltipTrigger>
                      <TooltipContent>{formatDate(s.last_run_finished_at)}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="font-mono text-muted-foreground">never</span>
                  )}

                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-mono">
                    {s.last_run_duration_ms != null ? formatDuration(Math.round(s.last_run_duration_ms / 1000)) : '—'}
                  </span>

                  <span className="text-muted-foreground">Rows synced</span>
                  <span className="font-mono">{formatNumber(s.last_run_rows_synced)}</span>
                </div>

                {s.last_run_error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 font-mono text-xs text-destructive">
                    {s.last_run_error}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Supabase error: {error.message}
        </div>
      )}
    </>
  )
}
