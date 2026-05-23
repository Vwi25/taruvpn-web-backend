import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusVariant = 'success' | 'warning' | 'destructive' | 'neutral' | 'default'

const STATUS_MAP: Record<string, StatusVariant> = {
  // Customer / device status
  active: 'success',
  legacy_active: 'success',
  pending: 'warning',
  suspended: 'warning',
  disabled: 'neutral',
  deleted: 'destructive',
  revoked: 'destructive',
  // Sync status
  success: 'success',
  partial: 'warning',
  failed: 'destructive',
  // Connection / handshake
  ACTIVE: 'success',
  IDLE: 'neutral',
  never: 'neutral',
}

interface StatusBadgeProps {
  status: string | null | undefined
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (status == null || status === '') {
    return (
      <Badge variant="outline" className={cn('font-mono text-xs', className)}>
        —
      </Badge>
    )
  }

  const variant = STATUS_MAP[status] ?? 'default'

  const styles: Record<StatusVariant, string> = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    destructive: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
    neutral: 'border-muted-foreground/30 bg-muted text-muted-foreground',
    default: '',
  }

  return (
    <Badge
      variant="outline"
      className={cn('font-mono text-xs capitalize', styles[variant], className)}
    >
      {status}
    </Badge>
  )
}
