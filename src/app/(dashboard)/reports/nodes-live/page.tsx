// Live realtime per-node health view. Server-component fetch on every page load
// from the NPM node-health aggregator (Phase 2). Sub-minute granularity — for
// "what's happening right now" answers that the 5-min CSV pipeline can't give.
//
// Complement to /reports/node-health (which is historical, Supabase-backed).

import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const AGGREGATOR_URL = process.env.NPM_AGGREGATOR_URL ?? 'http://127.0.0.1:8088'

// --- types matching aggregator JSON ---------------------------------------

interface NodeData {
  node: string
  timestamp: number
  system: {
    cpu_pct_1m: number | null
    load_1m: number | null
    load_5m: number | null
    load_15m: number | null
    ram_used_mb: number | null
    ram_total_mb: number | null
    disk_used_pct: number | null
    uptime_sec: number | null
  }
  services: Record<
    string,
    { active: boolean; uptime_sec: number | null; restart_count: number | null }
  >
  xray: {
    uplink_total_bytes: number | null
    downlink_total_bytes: number | null
    active_connections: number | null
    per_user: { user: string; up: number; down: number }[]
  }
  firewall: {
    l1_customer_geo_entries: number | null
    l2_sticky_entries: number | null
    fail2ban_currently_banned: number | null
  }
}

interface NodeEntry {
  ok: boolean
  stale_seconds: number | null
  error: string | null
  data: NodeData | null
}

type AggregateResp = Record<string, NodeEntry>

// --- format helpers --------------------------------------------------------

function fmtBytes(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

function fmtDuration(sec: number | null | undefined): string {
  if (sec == null) return '—'
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}m`
  if (sec < 86_400) return `${Math.floor(sec / 3600)}h${Math.floor((sec % 3600) / 60)}m`
  return `${Math.floor(sec / 86_400)}d${Math.floor((sec % 86_400) / 3600)}h`
}

function fmtPct(n: number | null): string {
  return n == null ? '—' : `${n.toFixed(1)}%`
}

// --- page ------------------------------------------------------------------

export default async function NodesLivePage() {
  let agg: AggregateResp | null = null
  let fetchError: string | null = null

  try {
    const r = await fetch(`${AGGREGATOR_URL}/api/v1/nodes/health`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })
    if (!r.ok) {
      fetchError = `Aggregator returned HTTP ${r.status}`
    } else {
      agg = (await r.json()) as AggregateResp
    }
  } catch (e) {
    fetchError = e instanceof Error ? e.message : String(e)
  }

  const entries = agg ? Object.entries(agg) : []
  // Order: JapanPro2 (hub) first, then alphabetical
  entries.sort(([a], [b]) => {
    if (a === 'JapanPro2') return -1
    if (b === 'JapanPro2') return 1
    return a.localeCompare(b)
  })

  return (
    <>
      <PageHeader
        title="Nodes (live)"
        description="Real-time per-node snapshot polled every 30s from the NPM aggregator (10.99.0.10 → 10.99.0.X:9100 via WG mesh). Refresh the page for newer data."
      />

      {fetchError && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Aggregator unreachable</p>
          <p className="mt-1 font-mono text-xs">{fetchError}</p>
          <p className="mt-2 text-xs">
            URL: <code className="font-mono">{AGGREGATOR_URL}</code>
          </p>
        </div>
      )}

      {!fetchError && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {entries.map(([name, entry]) => (
            <NodeCard key={name} name={name} entry={entry} />
          ))}
        </div>
      )}
    </>
  )
}

// --- per-node card --------------------------------------------------------

function NodeCard({ name, entry }: { name: string; entry: NodeEntry }) {
  const d = entry.data
  const staleStr =
    entry.stale_seconds == null
      ? 'never polled'
      : entry.stale_seconds < 60
        ? `${entry.stale_seconds}s ago`
        : `${Math.floor(entry.stale_seconds / 60)}m ago`

  if (!entry.ok || !d) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="font-mono">{name}</span>
            <Badge variant="destructive">offline</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Last poll: {staleStr}</p>
          {entry.error && (
            <p className="mt-1 font-mono text-xs">{entry.error}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  const ramPct =
    d.system.ram_used_mb != null && d.system.ram_total_mb
      ? Math.round((d.system.ram_used_mb / d.system.ram_total_mb) * 100)
      : null

  const services = Object.entries(d.services)
  const customers = d.xray.per_user.length
  const stale = entry.stale_seconds ?? 0
  const staleVariant: 'default' | 'secondary' | 'destructive' =
    stale > 180 ? 'destructive' : stale > 90 ? 'secondary' : 'default'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="font-mono">{name}</span>
          <Badge variant={staleVariant}>{staleStr}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* System row */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <Stat label="CPU" value={fmtPct(d.system.cpu_pct_1m)} />
          <Stat
            label="RAM"
            value={
              ramPct == null
                ? '—'
                : `${ramPct}% (${d.system.ram_used_mb}/${d.system.ram_total_mb} MB)`
            }
          />
          <Stat label="Disk" value={d.system.disk_used_pct != null ? `${d.system.disk_used_pct}%` : '—'} />
          <Stat label="Uptime" value={fmtDuration(d.system.uptime_sec)} />
        </div>

        {/* Services */}
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Services</p>
          <div className="flex flex-wrap gap-1.5">
            {services.map(([svc, info]) => (
              <span
                key={svc}
                className={`rounded-md border px-2 py-0.5 text-xs font-mono ${
                  info.active
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'border-muted bg-muted text-muted-foreground'
                }`}
                title={
                  info.uptime_sec != null
                    ? `up ${fmtDuration(info.uptime_sec)} · ${info.restart_count ?? 0} restarts`
                    : ''
                }
              >
                {svc.replace(/^wg-quick@/, 'wg:')}
              </span>
            ))}
          </div>
        </div>

        {/* xray traffic */}
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
            xray ({customers} customers, {d.xray.active_connections ?? 0} active TCP/443)
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-7 px-2">User</TableHead>
                <TableHead className="h-7 px-2 text-right">↑ Up</TableHead>
                <TableHead className="h-7 px-2 text-right">↓ Down</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.xray.per_user.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="px-2 py-2 text-center text-xs text-muted-foreground">
                    No traffic yet
                  </TableCell>
                </TableRow>
              )}
              {d.xray.per_user.map((u) => (
                <TableRow key={u.user}>
                  <TableCell className="px-2 py-1 font-mono text-xs">{u.user}</TableCell>
                  <TableCell className="px-2 py-1 text-right font-mono text-xs">{fmtBytes(u.up)}</TableCell>
                  <TableCell className="px-2 py-1 text-right font-mono text-xs">{fmtBytes(u.down)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Firewall */}
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Firewall</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Stat
              label="L1 geo"
              value={d.firewall.l1_customer_geo_entries != null ? `${d.firewall.l1_customer_geo_entries.toLocaleString()} CIDRs` : '— (OPNsense edge)'}
            />
            <Stat
              label="L2 sticky"
              value={d.firewall.l2_sticky_entries != null ? String(d.firewall.l2_sticky_entries) : '—'}
            />
            <Stat
              label="fail2ban"
              value={d.firewall.fail2ban_currently_banned != null ? `${d.firewall.fail2ban_currently_banned} banned` : '—'}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border p-2">
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono">{value}</p>
    </div>
  )
}
