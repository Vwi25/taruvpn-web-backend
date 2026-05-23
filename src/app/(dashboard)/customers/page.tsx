import { Check, Minus } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createAdminClient } from '@/lib/supabase/server'
import { formatRelative } from '@/lib/format'

export const dynamic = 'force-dynamic'

interface Customer {
  slug: string
  display_name: string | null
  customer_type: string
  status: string
  in_sqlite: boolean
  in_yaml: boolean
  in_wg_csv: boolean
  in_dual_csv: boolean
  created_at: string | null
}

function ProvenanceMark({ value }: { value: boolean }) {
  return value ? (
    <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />
  )
}

export default async function CustomersPage() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .schema('internal')
    .from('vpn_customers')
    .select('slug, display_name, customer_type, status, in_sqlite, in_yaml, in_wg_csv, in_dual_csv, created_at')
    .order('slug')

  const customers = (data ?? []) as Customer[]

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${customers.length} customer${customers.length === 1 ? '' : 's'} across all provisioning sources (SQLite / YAML / WG CSV / dual CSV).`}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">SQLite</TableHead>
                <TableHead className="text-center">YAML</TableHead>
                <TableHead className="text-center">WG CSV</TableHead>
                <TableHead className="text-center">Dual CSV</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.slug}>
                  <TableCell className="font-mono text-sm font-medium">{c.slug}</TableCell>
                  <TableCell>
                    <StatusBadge status={c.customer_type} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell><ProvenanceMark value={c.in_sqlite} /></TableCell>
                  <TableCell><ProvenanceMark value={c.in_yaml} /></TableCell>
                  <TableCell><ProvenanceMark value={c.in_wg_csv} /></TableCell>
                  <TableCell><ProvenanceMark value={c.in_dual_csv} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.created_at ? formatRelative(c.created_at) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {error && (
        <div className="mt-4 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Supabase error: {error.message}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Customers missing the SQLite check were provisioned by{' '}
        <code className="rounded bg-muted px-1 py-0.5 font-mono">cn/dual/wg add.sh</code> after the legacy
        2026-05-09 SQLite import (those scripts don&apos;t write vpn.db).
      </p>
    </>
  )
}
