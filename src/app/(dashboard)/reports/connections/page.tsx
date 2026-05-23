import { LineChart } from '@tremor/react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createAdminClient } from '@/lib/supabase/server'
import { chartTimeLabel, pivotByCategory, uniqueCategories } from '@/lib/chart-utils'
import { formatNumber } from '@/lib/format'

export const dynamic = 'force-dynamic'

const NODE_COLORS = ['blue', 'emerald', 'amber', 'rose', 'violet', 'cyan', 'orange'] as const

interface Row {
  ts: string
  node: string
  total_conns: number
  unique_src_ips: number
  top_ip: string | null
  top_ip_count: number | null
}

export default async function ConnectionsReportPage() {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()

  const { data, error } = await supabase
    .schema('internal')
    .from('metrics_concurrent_connections')
    .select('ts, node, total_conns, unique_src_ips, top_ip, top_ip_count')
    .gte('ts', since)
    .order('ts', { ascending: true })

  const rows = (data ?? []) as Row[]
  const nodes = uniqueCategories(rows, 'node')
  const chartData = pivotByCategory(rows, 'node', 'total_conns', (s) => chartTimeLabel(s))

  // Top source IPs (last 24h, aggregated)
  const ipAgg = new Map<string, { node: string; total: number; peak: number }>()
  for (const r of rows) {
    if (!r.top_ip) continue
    const key = `${r.node}|${r.top_ip}`
    const cur = ipAgg.get(key) ?? { node: r.node, total: 0, peak: 0 }
    cur.total += r.top_ip_count ?? 0
    cur.peak = Math.max(cur.peak, r.top_ip_count ?? 0)
    ipAgg.set(key, cur)
  }
  const topIPs = Array.from(ipAgg.entries())
    .map(([k, v]) => ({ ip: k.split('|')[1], ...v }))
    .sort((a, b) => b.peak - a.peak)
    .slice(0, 15)

  return (
    <>
      <PageHeader
        title="Connections"
        description={`TCP/443 concurrent sockets across ${nodes.length} nodes, last 24h (${rows.length.toLocaleString()} data points).`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Total connections per node — last 24h</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart
            className="h-72"
            data={chartData}
            index="date"
            categories={nodes}
            colors={NODE_COLORS.slice(0, nodes.length) as unknown as string[]}
            yAxisWidth={48}
            showAnimation={false}
            valueFormatter={(v) => v.toString()}
            noDataText="No data in window"
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Top source IPs (last 24h, peak per snapshot)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {topIPs.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No source IPs recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source IP</TableHead>
                  <TableHead>Node</TableHead>
                  <TableHead className="text-right">Peak concurrent</TableHead>
                  <TableHead className="text-right">Sum over window</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topIPs.map((r) => (
                  <TableRow key={`${r.node}-${r.ip}`}>
                    <TableCell className="font-mono text-sm">{r.ip}</TableCell>
                    <TableCell className="font-mono text-xs">{r.node}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(r.peak)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatNumber(r.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
