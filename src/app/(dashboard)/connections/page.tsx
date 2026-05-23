import { Network } from 'lucide-react'

import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createAdminClient } from '@/lib/supabase/server'
import { formatBytes, formatRelative } from '@/lib/format'

export const dynamic = 'force-dynamic'

interface Handshake {
  node: string
  pubkey: string
  customer_slug: string | null
  wg_ip: string | null
  endpoint: string | null
  last_handshake_at: string | null
  bytes_rx: number
  bytes_tx: number
  status: string | null
}

interface Connection {
  node: string
  src_ip: string
  conn_count: number
  customer_email: string | null
  customer_slug: string | null
  snapshot_at: string
}

export default async function ConnectionsPage() {
  const supabase = createAdminClient()

  const [handshakesRes, connectionsRes] = await Promise.all([
    supabase
      .schema('internal')
      .from('vpn_wg_handshakes')
      .select('node, pubkey, customer_slug, wg_ip, endpoint, last_handshake_at, bytes_rx, bytes_tx, status')
      .order('last_handshake_at', { ascending: false, nullsFirst: false }),
    supabase
      .schema('internal')
      .from('vpn_connections_current')
      .select('node, src_ip, conn_count, customer_email, customer_slug, snapshot_at')
      .order('conn_count', { ascending: false }),
  ])

  const handshakes = (handshakesRes.data ?? []) as Handshake[]
  const connections = (connectionsRes.data ?? []) as Connection[]
  const bothEmpty = handshakes.length === 0 && connections.length === 0

  return (
    <>
      <PageHeader
        title="Connections"
        description="Live snapshot of WG handshakes and Reality TCP sockets — populated by Phase C hot tier (every 30s)."
      />

      {bothEmpty ? (
        <EmptyState
          icon={Network}
          title="Connector hot tier not yet running"
          description="Active connections + WG handshake state populate every 30s once the hot tier systemd timer is configured. See Phase C of the SQLite deprecation plan."
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">WireGuard handshakes ({handshakes.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {handshakes.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">No WG handshakes recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Node</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>WG IP</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Last handshake</TableHead>
                      <TableHead className="text-right">RX / TX</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {handshakes.map((h) => (
                      <TableRow key={`${h.node}-${h.pubkey}`}>
                        <TableCell><StatusBadge status={h.status} /></TableCell>
                        <TableCell className="font-mono text-xs">{h.node}</TableCell>
                        <TableCell className="font-mono text-xs">{h.customer_slug ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{h.wg_ip ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{h.endpoint ?? '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {h.last_handshake_at ? formatRelative(h.last_handshake_at) : 'never'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatBytes(h.bytes_rx)} / {formatBytes(h.bytes_tx)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reality TCP connections ({connections.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {connections.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">No active Reality connections recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Node</TableHead>
                      <TableHead>Source IP</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Conns</TableHead>
                      <TableHead>Snapshot age</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connections.map((c) => (
                      <TableRow key={`${c.node}-${c.src_ip}`}>
                        <TableCell className="font-mono text-xs">{c.node}</TableCell>
                        <TableCell className="font-mono text-xs">{c.src_ip}</TableCell>
                        <TableCell className="font-mono text-xs">{c.customer_slug ?? c.customer_email ?? '—'}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{c.conn_count}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatRelative(c.snapshot_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
