import Link from 'next/link'
import {
  Activity,
  BarChart3,
  Cable,
  Gauge,
  LineChart,
  Radar,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const REPORTS = [
  {
    href: '/reports/nodes-live',
    title: 'Nodes (live)',
    description: 'Real-time per-node snapshot via WG mesh aggregator (30s polling). CPU/RAM/services/xray/firewall.',
    icon: Activity,
  },
  {
    href: '/reports/connections',
    title: 'Connections',
    description: 'TCP/443 concurrent sockets per node over time. Top source IPs.',
    icon: LineChart,
  },
  {
    href: '/reports/bandwidth',
    title: 'Bandwidth',
    description: 'Per-customer up/down traffic. Aggregated by node.',
    icon: TrendingUp,
  },
  {
    href: '/reports/node-health',
    title: 'Node health',
    description: 'Active flows, avg minRTT, retransmit rate. Burst detection.',
    icon: Gauge,
  },
  {
    href: '/reports/handshake',
    title: 'Handshake latency',
    description: 'NPM → node Reality handshake RTT + HTTP status distribution.',
    icon: Cable,
  },
  {
    href: '/reports/probes',
    title: 'Probes',
    description: 'L1 firewall drops per 5min. Unique source IPs. Burst alerts.',
    icon: Radar,
  },
  {
    href: '/reports/device-rate',
    title: 'Device rate',
    description: 'Per-device Mbps. Customer caps. Over-limit detection (shadow).',
    icon: BarChart3,
  },
  {
    href: '/reports/sni-cert',
    title: 'SNI cert',
    description: 'Reality cloak certificate drift tracking per node + SNI.',
    icon: ShieldAlert,
  },
] as const

export default function ReportsIndex() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Time-series operational data pumped from /home/vwision/metrics/*.csv to Supabase by the connector cold tier."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href} className="group">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-muted p-2 group-hover:bg-primary/10 transition-colors">
                    <r.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base">{r.title}</CardTitle>
                    <CardDescription className="text-xs">{r.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
