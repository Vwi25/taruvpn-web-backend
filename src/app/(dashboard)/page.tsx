import { Activity, Network, RefreshCw, Server, Users } from 'lucide-react'

import { KpiCard } from '@/components/kpi-card'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createAdminClient } from '@/lib/supabase/server'
import { formatRelative } from '@/lib/format'

export const dynamic = 'force-dynamic'

interface DashboardData {
  customerCount: number
  nodeCount: number
  wgHandshakeCount: number
  lastSyncAt: string | null
  recentEvents: Array<{
    id: number
    event_timestamp: string
    customer_slug: string | null
    event_type: string
    actor: string
  }>
  error: string | null
}

async function getDashboardData(): Promise<DashboardData> {
  const supabase = createAdminClient()

  const [customers, nodes, sync, events, handshakes] = await Promise.all([
    supabase.schema('internal').from('vpn_customers').select('slug', { count: 'exact', head: true }),
    supabase.schema('internal').from('vpn_nodes').select('name', { count: 'exact', head: true }),
    supabase
      .schema('internal')
      .from('vpn_sync_status')
      .select('last_run_finished_at')
      .order('last_run_finished_at', { ascending: false })
      .limit(1),
    supabase
      .schema('internal')
      .from('vpn_device_events_recent')
      .select('id, event_timestamp, customer_slug, event_type, actor')
      .order('event_timestamp', { ascending: false })
      .limit(5),
    supabase.schema('internal').from('vpn_wg_handshakes').select('node', { count: 'exact', head: true }),
  ])

  return {
    customerCount: customers.count ?? 0,
    nodeCount: nodes.count ?? 0,
    wgHandshakeCount: handshakes.count ?? 0,
    lastSyncAt: sync.data?.[0]?.last_run_finished_at ?? null,
    recentEvents: events.data ?? [],
    error: customers.error?.message ?? nodes.error?.message ?? events.error?.message ?? null,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="vwision VPN operator overview — live data from internal.* via service role."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Customers" value={data.customerCount} icon={Users} hint="across all customer types" />
        <KpiCard label="Nodes" value={data.nodeCount} icon={Server} hint="registered in NODES_REGISTRY" />
        <KpiCard
          label="WG handshakes"
          value={data.wgHandshakeCount}
          icon={Network}
          hint={data.wgHandshakeCount === 0 ? '(0 until hot tier runs)' : undefined}
        />
        <KpiCard
          label="Last sync"
          value={data.lastSyncAt ? formatRelative(data.lastSyncAt) : 'never'}
          icon={RefreshCw}
          hint={data.lastSyncAt ?? 'connector tiers not scheduled yet'}
        />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Recent events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent events.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentEvents.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatRelative(e.event_timestamp)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.customer_slug ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={e.event_type} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.actor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data.error && (
        <div className="mt-4 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Supabase error: {data.error}
        </div>
      )}
    </>
  )
}
