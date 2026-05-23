import { AreaChart } from '@tremor/react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createAdminClient } from '@/lib/supabase/server'
import { chartTimeLabel, uniqueCategories } from '@/lib/chart-utils'
import { formatBytes } from '@/lib/format'

export const dynamic = 'force-dynamic'

const CUSTOMER_COLORS = ['blue', 'emerald', 'amber', 'rose', 'violet', 'cyan', 'orange'] as const

interface Row {
  ts: string
  node: string
  email: string
  uplink_bytes: number
  downlink_bytes: number
}

export default async function BandwidthReportPage() {
  const supabase = await createAdminClient()
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()

  const { data, error } = await supabase
    .schema('internal')
    .from('metrics_user_bandwidth')
    .select('ts, node, email, uplink_bytes, downlink_bytes')
    .gte('ts', since)
    .order('ts', { ascending: true })

  const rows = (data ?? []) as Row[]

  // Aggregate total bytes (uplink + downlink) per timestamp per customer
  const agg = new Map<string, Map<string, number>>()
  for (const r of rows) {
    if (!agg.has(r.ts)) agg.set(r.ts, new Map())
    const cur = agg.get(r.ts)!.get(r.email) ?? 0
    agg.get(r.ts)!.set(r.email, cur + r.uplink_bytes + r.downlink_bytes)
  }
  const customers = uniqueCategories(rows, 'email')

  const chartData = Array.from(agg.entries())
    .map(([ts, m]) => {
      const point: Record<string, string | number> = { date: chartTimeLabel(ts) }
      for (const c of customers) point[c] = (m.get(c) ?? 0) / 1024 / 1024 // MB
      return point
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))

  // Per-customer totals
  const totals = new Map<string, { up: number; down: number }>()
  for (const r of rows) {
    const cur = totals.get(r.email) ?? { up: 0, down: 0 }
    cur.up += r.uplink_bytes
    cur.down += r.downlink_bytes
    totals.set(r.email, cur)
  }
  const totalRows = Array.from(totals.entries())
    .map(([email, v]) => ({ email, up: v.up, down: v.down, total: v.up + v.down }))
    .sort((a, b) => b.total - a.total)

  return (
    <>
      <PageHeader
        title="Bandwidth"
        description={`Per-customer up/down traffic — last 24h. ${rows.length.toLocaleString()} samples across ${customers.length} customers.`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Total bandwidth per customer (MB) — last 24h</CardTitle>
        </CardHeader>
        <CardContent>
          <AreaChart
            className="h-72"
            data={chartData}
            index="date"
            categories={customers}
            colors={CUSTOMER_COLORS.slice(0, customers.length) as unknown as string[]}
            yAxisWidth={56}
            showAnimation={false}
            valueFormatter={(v) => `${v.toFixed(1)} MB`}
            stack
            noDataText="No bandwidth data in window"
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Per-customer totals (last 24h)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {totalRows.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No bandwidth data.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Uplink</TableHead>
                  <TableHead className="text-right">Downlink</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalRows.map((r) => (
                  <TableRow key={r.email}>
                    <TableCell className="font-mono text-sm">{r.email}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatBytes(r.up)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatBytes(r.down)}</TableCell>
                    <TableCell className="text-right font-mono">{formatBytes(r.total)}</TableCell>
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
