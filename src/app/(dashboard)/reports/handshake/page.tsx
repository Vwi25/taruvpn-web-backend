import { DonutChart, LineChart } from '@tremor/react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createAdminClient } from '@/lib/supabase/server'
import { chartTimeLabel, pivotByCategory, uniqueCategories } from '@/lib/chart-utils'

export const dynamic = 'force-dynamic'

const NODE_COLORS = ['blue', 'emerald', 'amber', 'rose', 'violet', 'cyan', 'orange'] as const

interface Row {
  ts: string
  node: string
  latency_ms: number | null
  http_status: number | null
  ok: boolean | null
  quality: string | null
}

export default async function HandshakeReportPage() {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()

  const { data, error } = await supabase
    .schema('internal')
    .from('metrics_handshake_latency')
    .select('ts, node, latency_ms, http_status, ok, quality')
    .gte('ts', since)
    .order('ts', { ascending: true })

  const rows = (data ?? []) as Row[]
  const nodes = uniqueCategories(rows, 'node')

  const latencyData = pivotByCategory(
    rows.map((r) => ({ ts: r.ts, node: r.node, val: r.latency_ms ?? 0 })),
    'node', 'val', (s) => chartTimeLabel(s),
  )

  // Quality distribution (donut)
  const qualityCounts = new Map<string, number>()
  for (const r of rows) {
    const q = r.quality ?? (r.ok ? 'ok' : 'fail')
    qualityCounts.set(q, (qualityCounts.get(q) ?? 0) + 1)
  }
  const qualityData = Array.from(qualityCounts.entries()).map(([name, value]) => ({ name, value }))

  // HTTP status distribution
  const statusCounts = new Map<number | string, number>()
  for (const r of rows) {
    const s = r.http_status ?? 'none'
    statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1)
  }
  const statusData = Array.from(statusCounts.entries()).map(([name, value]) => ({ name: String(name), value }))

  return (
    <>
      <PageHeader
        title="Handshake latency"
        description={`NPM → node Reality handshake RTT, last 24h. ${rows.length.toLocaleString()} probes across ${nodes.length} nodes.`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Handshake latency (ms) per node — last 24h</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart
            className="h-72"
            data={latencyData}
            index="date"
            categories={nodes}
            colors={NODE_COLORS.slice(0, nodes.length) as unknown as string[]}
            yAxisWidth={56}
            showAnimation={false}
            valueFormatter={(v) => `${Math.round(v)}ms`}
            noDataText="No handshake data"
          />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quality distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              className="h-56"
              data={qualityData}
              category="value"
              index="name"
              colors={['emerald', 'amber', 'rose', 'gray']}
              showAnimation={false}
              valueFormatter={(v) => `${v.toLocaleString()} probes`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">HTTP status distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              className="h-56"
              data={statusData}
              category="value"
              index="name"
              colors={['emerald', 'blue', 'amber', 'rose']}
              showAnimation={false}
              valueFormatter={(v) => `${v.toLocaleString()} probes`}
            />
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
