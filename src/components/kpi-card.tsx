import type { LucideIcon } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  trend?: 'up' | 'down' | 'flat'
  className?: string
}

export function KpiCard({ label, value, hint, icon: Icon, trend, className }: KpiCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint && (
          <p
            className={cn(
              'text-xs',
              trend === 'up' && 'text-emerald-600 dark:text-emerald-400',
              trend === 'down' && 'text-red-600 dark:text-red-400',
              !trend && 'text-muted-foreground',
            )}
          >
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
