import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LogViewer } from '@/components/operations/log-viewer'
import type { JobStatus } from '@/components/operations/job-status-badge'
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

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createAdminClient()
  const { data } = await supabase
    .schema('internal')
    .from('operator_jobs')
    .select(
      'id, kind, args, operator_email, status, exit_code, started_at, finished_at, created_at',
    )
    .eq('id', id)
    .maybeSingle()

  if (!data) notFound()
  const j = data as JobRow
  const label =
    (REGISTRY[j.kind as OperationKind]?.label as string | undefined) ?? j.kind

  return (
    <>
      <div className="mb-2">
        <Link
          href="/operations/history"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" />
          All jobs
        </Link>
      </div>

      <PageHeader
        title={label}
        description={
          <span className="font-mono">
            {j.kind} &middot; queued {formatRelative(j.created_at)} by {j.operator_email}
          </span>
        }
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Args</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded bg-muted p-3 font-mono text-xs">
            {JSON.stringify(j.args, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live log</CardTitle>
        </CardHeader>
        <CardContent>
          <LogViewer jobId={j.id} initialStatus={j.status} />
        </CardContent>
      </Card>
    </>
  )
}
