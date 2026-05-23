import { LineChart } from '@tremor/react'

import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createAdminClient } from '@/lib/supabase/server'
import { chartTimeLabel } from '@/lib/chart-utils'

export const dynamic = 'force-dynamic'

const CUSTOMER_COLORS = ['blue', 'emerald', 'amber', 'rose', 'violet', 'cyan', 'orange'] as const

interface Row {
  ts: string
  node: string
  customer: string | null
  xray_email: string
  total_mbps: number | null
  device_mbps_cap: number | null
  device_over_cap: boolean | null
  customer_total_mbps: number | null
  customer_mbps_cap: number | null
  customer_over_cap: boolean | null
}

export default async function DeviceRateReportPage() {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()

  const { data, error } = await supabase
    .schema('internal')
    .from('metrics_device_rate_5m')
    .select('ts, node, customer, xray_email, total_mbps, device_mbps_cap, device_over_cap, customer_total_mbps, customer_mbps_cap, customer_over_cap')
    .gte('ts', since)
    .order('ts', { ascending: true })

  const rows = (data ?? []) as Row[]

  // Aggregate Mbps per timestamp per customer
  const agg = new Map<string, Map<string, number>>()
  for (const r of rows) {
    const cust = r.customer ?? r.xray_email
    if (!agg.has(r.ts)) agg.set(r.ts, new Map())
    const cur = agg.get(r.ts)!.get(cust) ?? 0
    agg.get(r.ts)!.set(cust, Math.max(cur, r.total_mbps ?? 0))
  }
  const customers = Array.from(new Set(rows.map((r) => r.customer ?? r.xray_email))).sort()
  const chartData = Array.from(agg.entries())
    .map(([ts, m]) => {
      const point: Record<string, string | number> = { date: chartTimeLabel(ts) }
      for (const c of customers) point[c] = m.get(c) ?? 0
      return point
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))

  // Over-cap events
  const overCap = rows.filter((r) => r.device_over_cap || r.customer_over_cap).slice(-30).reverse()

  return (
    <>
      <PageHeader
        title="Device rate"
        description={`Per-device Mbps + customer-aggregate caps. Last 24h. Enforcement = shadow only (monitor).`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mbps per customer (peak per 5-min) — last 24h</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart
            className="h-72"
            data={chartData}
            index="date"
            categories={customers}
            colors={CUSTOMER_COLORS.slice(0, customers.length) as unknown as string[]}
            yAxisWidth={56}
            showAnimation={false}
            valueFormatter={(v) => `${v.toFixed(1)} Mbps`}
            noDataText="No device-rate samples"
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Recent over-cap events ({overCap.length} shown)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {overCap.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No over-cap events in window — all customers within limits.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Node</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Device Mbps</TableHead>
                  <TableHead className="text-right">Cust Mbps</TableHead>
                  <TableHead>Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overCap.map((r, i) => (
                  <TableRow key={`${r.ts}-${r.xray_email}-${i}`}>
                    <TableCell className="font-mono text-xs">{chartTimeLabel(r.ts)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.node}</TableCell>
                    <TableCell className="font-mono text-xs">{r.customer ?? r.xray_email}</TableCell>
                    <TableCell className="text-right font-mono">
                      {(r.total_mbps ?? 0).toFixed(1)} / {r.device_mbps_cap?.toFixed(0) ?? '∞'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(r.customer_total_mbps ?? 0).toFixed(1)} / {r.customer_mbps_cap?.toFixed(0) ?? '∞'}
                    </TableCell>
                    <TableCell className="flex gap-1">
                      {r.device_over_cap && <Badge variant="outline" className="text-xs">device</Badge>}
                      {r.customer_over_cap && <Badge variant="outline" className="text-xs">customer</Badge>}
                    </TableCell>
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
