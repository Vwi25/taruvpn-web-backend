import { BarChart } from '@/components/charts'

import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createAdminClient } from '@/lib/supabase/server'
import { chartTimeLabel, pivotByCategory, uniqueCategories } from '@/lib/chart-utils'
import { formatNumber } from '@/lib/format'

export const dynamic = 'force-dynamic'

const NODE_COLORS = ['blue', 'emerald', 'amber', 'rose', 'violet', 'cyan'] as const

interface Row {
  ts: string
  node: string
  drops_5min: number
  unique_ips: number
  top_ip: string | null
  top_ip_hits: number | null
  burst_flag: string | null
}

export default async function ProbesReportPage() {
  const supabase = await createAdminClient()
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()

  const { data, error } = await supabase
    .schema('internal')
    .from('metrics_probes')
    .select('ts, node, drops_5min, unique_ips, top_ip, top_ip_hits, burst_flag')
    .gte('ts', since)
    .order('ts', { ascending: true })

  const rows = (data ?? []) as Row[]
  const nodes = uniqueCategories(rows, 'node')

  const dropsData = pivotByCategory(
    rows.map((r) => ({ ts: r.ts, node: r.node, val: r.drops_5min })),
    'node', 'val', (s) => chartTimeLabel(s),
  )

  // Top prober IPs aggregated over window
  const ipAgg = new Map<string, { node: string; total: number; peak: number }>()
  for (const r of rows) {
    if (!r.top_ip) continue
    const key = `${r.node}|${r.top_ip}`
    const cur = ipAgg.get(key) ?? { node: r.node, total: 0, peak: 0 }
    cur.total += r.top_ip_hits ?? 0
    cur.peak = Math.max(cur.peak, r.top_ip_hits ?? 0)
    ipAgg.set(key, cur)
  }
  const topProbers = Array.from(ipAgg.entries())
    .map(([k, v]) => ({ ip: k.split('|')[1], ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)

  // Burst events
  const bursts = rows.filter((r) => r.burst_flag && r.burst_flag !== '').slice(-20).reverse()

  return (
    <>
      <PageHeader
        title="Probes"
        description={`L1 firewall drops per 5-min window, last 24h. ${rows.length.toLocaleString()} samples.`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">L1 drops per node (per 5min) — last 24h</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            className="h-72"
            data={dropsData}
            index="date"
            categories={nodes}
            colors={NODE_COLORS.slice(0, nodes.length) as unknown as string[]}
            yAxisWidth={56}
            format="integer"
            stack
            noDataText="No probe activity"
          />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top prober IPs (last 24h)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topProbers.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No probe IPs recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP</TableHead>
                    <TableHead>Node</TableHead>
                    <TableHead className="text-right">Hits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProbers.map((r) => (
                    <TableRow key={`${r.node}-${r.ip}`}>
                      <TableCell className="font-mono text-xs">{r.ip}</TableCell>
                      <TableCell className="font-mono text-xs">{r.node}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(r.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent burst events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {bursts.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No bursts in window.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Node</TableHead>
                    <TableHead className="text-right">Drops</TableHead>
                    <TableHead>Flag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bursts.map((r, i) => (
                    <TableRow key={`${r.ts}-${r.node}-${i}`}>
                      <TableCell className="font-mono text-xs">{chartTimeLabel(r.ts)}</TableCell>
                      <TableCell className="font-mono text-xs">{r.node}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(r.drops_5min)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {r.burst_flag}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
        </div>
      )}
    </>
  )
}
