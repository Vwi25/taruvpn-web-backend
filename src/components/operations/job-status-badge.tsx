import { Badge } from '@/components/ui/badge'

export type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed'

const LABELS: Record<JobStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  succeeded: 'Succeeded',
  failed: 'Failed',
}

const CLASSES: Record<JobStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 animate-pulse',
  succeeded: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  failed: 'bg-destructive/15 text-destructive',
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge variant="outline" className={`border-transparent font-mono text-xs ${CLASSES[status]}`}>
      {LABELS[status]}
    </Badge>
  )
}
