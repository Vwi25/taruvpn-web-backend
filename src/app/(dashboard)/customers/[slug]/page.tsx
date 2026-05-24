import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createAdminClient } from '@/lib/supabase/server'
import { formatRelative } from '@/lib/format'

import { CustomerRowActions } from '../_components/customer-row-actions'
import { AddDeviceButton } from './_components/add-device-button'
import { DeviceActions } from './_components/device-actions'

export const dynamic = 'force-dynamic'

interface Customer {
  slug: string
  display_name: string | null
  customer_type: string
  status: string
  created_at: string | null
}

interface Device {
  id: number
  device_name: string
  xray_email: string
  xray_uuid: string
  status: string
  lock_status: string | null
  last_seen_at: string | null
  last_seen_node: string | null
  created_at: string
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createAdminClient()

  const [{ data: customer }, { data: devices }] = await Promise.all([
    supabase
      .schema('internal')
      .from('vpn_customers')
      .select('slug, display_name, customer_type, status, created_at')
      .eq('slug', slug)
      .maybeSingle(),
    supabase
      .schema('internal')
      .from('vpn_devices')
      .select(
        'id, device_name, xray_email, xray_uuid, status, lock_status, last_seen_at, last_seen_node, created_at',
      )
      .eq('customer_slug', slug)
      .order('created_at', { ascending: true }),
  ])

  if (!customer) notFound()

  const c = customer as Customer
  const deviceRows = (devices ?? []) as Device[]

  return (
    <>
      <div className="mb-2">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" />
          All customers
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={c.slug}
          description={
            <>
              <StatusBadge status={c.customer_type} /> &middot;{' '}
              <StatusBadge status={c.status} /> &middot; Created{' '}
              {c.created_at ? formatRelative(c.created_at) : '—'}
            </>
          }
        />
        <div className="pt-1">
          <CustomerRowActions slug={c.slug} customerType={c.customer_type} />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            Devices ({deviceRows.length})
          </CardTitle>
          <AddDeviceButton customer={c.slug} />
        </CardHeader>
        <CardContent className="p-0">
          {deviceRows.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No devices yet. Click <strong>Add device</strong> to stage one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>xray email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lock</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deviceRows.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.device_name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {d.xray_email}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={d.status} />
                    </TableCell>
                    <TableCell>
                      {d.lock_status ? (
                        <StatusBadge status={d.lock_status} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {d.last_seen_at
                        ? `${formatRelative(d.last_seen_at)}${d.last_seen_node ? ` @ ${d.last_seen_node}` : ''}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeviceActions
                        customer={c.slug}
                        device={d.device_name}
                        status={d.status}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
