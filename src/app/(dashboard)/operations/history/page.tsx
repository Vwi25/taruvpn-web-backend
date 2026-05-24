import Link from 'next/link'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { JobStatusBadge, type JobStatus } from '@/components/operations/job-status-badge'
import { createAdminClient } from '@/lib/supabase/server'
import { formatRelative } from '@/lib/format'
import { REGISTRY, type OperationKind } from '@/lib/operations/registry'

export const dynamic = 'force-dynamic'

interface JobRow {
  id: string
  kind: string
  args: Record<string, unknown>
  operator_email: string
  status: JobStatus
  exit_code: number | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

function durationMs(started: string | null, finished: string | null): string {
  if (!started) return '—'
  const end = finished ? new Date(finished).getTime() : Date.now()
  const ms = end - new Date(started).getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}

function labelFor(kind: string): string {
  return (REGISTRY[kind as OperationKind]?.label as string | undefined) ?? kind
}

function argsSummary(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(' ')
}

export default async function HistoryPage() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .schema('internal')
    .from('operator_jobs')
    .select(
      'id, kind, args, operator_email, status, exit_code, started_at, finished_at, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(100)

  const jobs = (data ?? []) as JobRow[]

  return (
    <>
      <PageHeader
        title="Operation history"
        description={`Last ${jobs.length} job${jobs.length === 1 ? '' : 's'} run from the web admin.`}
      />

      <Card>
        <CardContent className="p-0">
          {jobs.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">
              No jobs yet. Trigger one from the Customers page.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      <Link
                        href={`/operations/history/${j.id}`}
                        className="hover:underline underline-offset-2"
                      >
                        {formatRelative(j.created_at)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{labelFor(j.kind)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {argsSummary(j.args)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {j.operator_email}
                    </TableCell>
                    <TableCell>
                      <JobStatusBadge status={j.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {durationMs(j.started_at, j.finished_at)}
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
