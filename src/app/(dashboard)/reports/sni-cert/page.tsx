import { LineChart } from '@tremor/react'

import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createAdminClient } from '@/lib/supabase/server'
import { chartTimeLabel } from '@/lib/chart-utils'
import { formatRelative } from '@/lib/format'

export const dynamic = 'force-dynamic'

const NODE_COLORS = ['blue', 'emerald', 'amber', 'rose', 'violet', 'cyan', 'orange'] as const

interface Row {
  ts: string
  node: string
  sni: string
  cert_bytes: number | null
  cert_count: number | null
  tls_version: string | null
  handshake_ok: boolean | null
  drift_flag: string | null
}

export default async function SniCertReportPage() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .schema('internal')
    .from('metrics_sni_cert_history')
    .select('ts, node, sni, cert_bytes, cert_count, tls_version, handshake_ok, drift_flag')
    .order('ts', { ascending: true })

  const rows = (data ?? []) as Row[]
  const sniKeys = Array.from(new Set(rows.map((r) => `${r.node}:${r.sni}`))).sort()

  // Pivot cert_bytes by (node:sni) per timestamp
  const buckets = new Map<string, Record<string, string | number>>()
  for (const r of rows) {
    const key = `${r.node}:${r.sni}`
    const tsKey = r.ts
    if (!buckets.has(tsKey)) buckets.set(tsKey, { date: chartTimeLabel(r.ts, true) })
    if (r.cert_bytes != null) buckets.get(tsKey)![key] = r.cert_bytes
  }
  const chartData = Array.from(buckets.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))

  // Latest per (node, sni)
  const latest = new Map<string, Row>()
  for (const r of rows) {
    const key = `${r.node}:${r.sni}`
    const cur = latest.get(key)
    if (!cur || r.ts > cur.ts) latest.set(key, r)
  }
  const latestRows = Array.from(latest.values()).sort((a, b) => a.node.localeCompare(b.node))

  const drifts = rows.filter((r) => r.drift_flag && r.drift_flag !== 'OK')

  return (
    <>
      <PageHeader
        title="SNI cert history"
        description={`Reality SNI certificate drift tracking. Sweet zone: 3500-5400 bytes. ${rows.length} snapshots across ${sniKeys.length} (node, SNI) pairs.`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cert size (bytes) — full history per (node, SNI)</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart
            className="h-72"
            data={chartData}
            index="date"
            categories={sniKeys}
            colors={NODE_COLORS.slice(0, sniKeys.length) as unknown as string[]}
            yAxisWidth={56}
            showAnimation={false}
            valueFormatter={(v) => `${v.toLocaleString()}B`}
            noDataText="No cert history"
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Latest snapshot per (node, SNI)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node</TableHead>
                <TableHead>SNI</TableHead>
                <TableHead className="text-right">Cert bytes</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead>TLS</TableHead>
                <TableHead>Handshake</TableHead>
                <TableHead>Drift</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestRows.map((r) => (
                <TableRow key={`${r.node}-${r.sni}`}>
                  <TableCell className="font-mono text-xs">{r.node}</TableCell>
                  <TableCell className="font-mono text-xs">{r.sni}</TableCell>
                  <TableCell
                    className={`text-right font-mono ${
                      (r.cert_bytes ?? 0) < 3500 || (r.cert_bytes ?? 0) > 5400 ? 'text-amber-600' : ''
                    }`}
                  >
                    {r.cert_bytes?.toLocaleString() ?? '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono">{r.cert_count ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{r.tls_version ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.handshake_ok ? 'success' : 'failed'} />
                  </TableCell>
                  <TableCell>
                    {r.drift_flag === 'OK' || !r.drift_flag ? (
                      <span className="text-xs text-muted-foreground">OK</span>
                    ) : (
                      <StatusBadge status={r.drift_flag} />
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatRelative(r.ts)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {drifts.length > 0 && (
        <Card className="mt-6 border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-base">⚠ Drift events ({drifts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Node</TableHead>
                  <TableHead>SNI</TableHead>
                  <TableHead className="text-right">Bytes</TableHead>
                  <TableHead>Flag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drifts.slice(-30).reverse().map((r, i) => (
                  <TableRow key={`${r.ts}-${r.node}-${r.sni}-${i}`}>
                    <TableCell className="font-mono text-xs">{formatRelative(r.ts)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.node}</TableCell>
                    <TableCell className="font-mono text-xs">{r.sni}</TableCell>
                    <TableCell className="text-right font-mono">{r.cert_bytes?.toLocaleString() ?? '—'}</TableCell>
                    <TableCell><StatusBadge status={r.drift_flag} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="mt-4 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
        </div>
      )}
    </>
  )
}
