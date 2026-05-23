import { Activity } from 'lucide-react'

import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { createAdminClient } from '@/lib/supabase/server'
import { formatDate, formatRelative } from '@/lib/format'

export const dynamic = 'force-dynamic'

interface EventRow {
  id: number
  event_timestamp: string
  customer_slug: string | null
  event_type: string
  source: 'device_event' | 'lock_event'
  node?: string | null
  xray_email?: string | null
  details?: string | null
}

async function getEvents(): Promise<{ events: EventRow[]; error: string | null }> {
  const supabase = await createAdminClient()

  const [deviceEvents, lockEvents] = await Promise.all([
    supabase
      .schema('internal')
      .from('vpn_device_events_recent')
      .select('id, event_timestamp, customer_slug, event_type, details, actor')
      .order('event_timestamp', { ascending: false })
      .limit(50),
    supabase
      .schema('internal')
      .from('vpn_device_lock_events')
      .select('id, event_timestamp, customer_slug, event_type, node, xray_email, action, result')
      .order('event_timestamp', { ascending: false })
      .limit(50),
  ])

  const events: EventRow[] = [
    ...(deviceEvents.data ?? []).map((e) => ({
      id: e.id,
      event_timestamp: e.event_timestamp,
      customer_slug: e.customer_slug,
      event_type: e.event_type,
      source: 'device_event' as const,
      details: e.details,
    })),
    ...(lockEvents.data ?? []).map((e) => ({
      id: e.id + 100_000_000, // dedupe key collision risk between two tables
      event_timestamp: e.event_timestamp,
      customer_slug: e.customer_slug,
      event_type: e.event_type,
      source: 'lock_event' as const,
      node: e.node,
      xray_email: e.xray_email,
      details: `${e.action} → ${e.result}`,
    })),
  ]
    .sort((a, b) => new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime())
    .slice(0, 100)

  return {
    events,
    error: deviceEvents.error?.message ?? lockEvents.error?.message ?? null,
  }
}

export default async function EventsPage() {
  const { events, error } = await getEvents()

  return (
    <>
      <PageHeader
        title="Events"
        description="Combined audit feed — device_events + device_lock_events, last 100 entries."
      />

      {events.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No events yet"
          description="Device lock/rate-limit events appear here as they're written by the metrics cron on each node."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Node</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={`${e.source}-${e.id}`}>
                    <TableCell className="text-xs">
                      <Tooltip>
                        <TooltipTrigger className="font-mono text-muted-foreground">
                          {formatRelative(e.event_timestamp)}
                        </TooltipTrigger>
                        <TooltipContent>{formatDate(e.event_timestamp)}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {e.source === 'device_event' ? 'device' : 'lock'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.customer_slug ?? e.xray_email ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={e.event_type} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.details ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{e.node ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="mt-4 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Supabase error: {error}
        </div>
      )}
    </>
  )
}
