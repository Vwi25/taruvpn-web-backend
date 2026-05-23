import { LineChart } from '@/components/charts'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createAdminClient } from '@/lib/supabase/server'
import { chartTimeLabel, pivotByCategory, uniqueCategories } from '@/lib/chart-utils'

export const dynamic = 'force-dynamic'

const NODE_COLORS = ['blue', 'emerald', 'amber', 'rose', 'violet', 'cyan', 'orange'] as const

interface Row {
  ts: string
  node: string
  active_flows: number | null
  avg_minrtt_ms: number | null
  retrans_pct: number | null
  total_sent_mb: number | null
}

export default async function NodeHealthReportPage() {
  const supabase = await createAdminClient()
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()

  const { data, error } = await supabase
    .schema('internal')
    .from('metrics_node_health')
    .select('ts, node, active_flows, avg_minrtt_ms, retrans_pct, total_sent_mb')
    .gte('ts', since)
    .order('ts', { ascending: true })

  const rows = (data ?? []) as Row[]
  const nodes = uniqueCategories(rows, 'node')
  const rttData = pivotByCategory(
    rows.map((r) => ({ ts: r.ts, node: r.node, val: r.avg_minrtt_ms ?? 0 })),
    'node', 'val', (s) => chartTimeLabel(s),
  )
  const retransData = pivotByCategory(
    rows.filter((r) => (r.retrans_pct ?? 0) > 0).map((r) => ({ ts: r.ts, node: r.node, val: r.retrans_pct ?? 0 })),
    'node', 'val', (s) => chartTimeLabel(s),
  )

  // Latest per-node snapshot for summary
  const latest = new Map<string, Row>()
  for (const r of rows) {
    const cur = latest.get(r.node)
    if (!cur || r.ts > cur.ts) latest.set(r.node, r)
  }
  const summaryRows = Array.from(latest.values()).sort((a, b) => a.node.localeCompare(b.node))

  return (
    <>
      <PageHeader
        title="Node health"
        description={`Active flows, RTT, and retransmit rate across ${nodes.length} nodes. Last 24h.`}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">avg minRTT (ms) per node</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              className="h-64"
              data={rttData}
              index="date"
              categories={nodes}
              colors={NODE_COLORS.slice(0, nodes.length) as unknown as string[]}
              yAxisWidth={48}
              format="ms"
              noDataText="No data in window"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">TCP retransmit % per node (filtered &gt;0)</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              className="h-64"
              data={retransData}
              index="date"
              categories={nodes}
              colors={NODE_COLORS.slice(0, nodes.length) as unknown as string[]}
              yAxisWidth={48}
              format="percent"
              noDataText="No retransmits (excellent)"
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Latest snapshot per node</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node</TableHead>
                <TableHead className="text-right">Active flows</TableHead>
                <TableHead className="text-right">avg minRTT</TableHead>
                <TableHead className="text-right">Retrans %</TableHead>
                <TableHead className="text-right">Total sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryRows.map((r) => (
                <TableRow key={r.node}>
                  <TableCell className="font-mono text-sm">{r.node}</TableCell>
                  <TableCell className="text-right font-mono">{r.active_flows ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono">{(r.avg_minrtt_ms ?? 0).toFixed(1)}ms</TableCell>
                  <TableCell className={`text-right font-mono ${(r.retrans_pct ?? 0) > 1 ? 'text-amber-600' : ''}`}>
                    {(r.retrans_pct ?? 0).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{(r.total_sent_mb ?? 0).toFixed(1)} MB</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {error && (
        <div className="mt-4 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
        </div>
      )}
    </>
  )
}
