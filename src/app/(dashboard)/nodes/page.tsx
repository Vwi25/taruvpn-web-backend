import { Check, Minus } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface Node {
  name: string
  host: string
  ssh_user: string
  capability_flags: string | null
  yaml_name: string | null
  has_wg_customers: boolean
  has_l1_firewall: boolean
}

export default async function NodesPage() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .schema('internal')
    .from('vpn_nodes')
    .select('name, host, ssh_user, capability_flags, yaml_name, has_wg_customers, has_l1_firewall')
    .order('name')

  const nodes = (data ?? []) as Node[]

  return (
    <>
      <PageHeader
        title="Nodes"
        description={`${nodes.length} node${nodes.length === 1 ? '' : 's'} registered in lib/multi-node.sh. Live xray health populated by Phase C hot tier (not yet running).`}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>YAML name</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>SSH user</TableHead>
                <TableHead>Capability flags</TableHead>
                <TableHead className="text-center">L1 firewall</TableHead>
                <TableHead className="text-center">WG exit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((n) => (
                <TableRow key={n.name}>
                  <TableCell className="font-mono text-sm font-medium">{n.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{n.yaml_name ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{n.host}</TableCell>
                  <TableCell className="font-mono text-xs">{n.ssh_user}</TableCell>
                  <TableCell>
                    {n.capability_flags ? (
                      <div className="flex flex-wrap gap-1">
                        {n.capability_flags.split(',').map((flag) => (
                          <Badge key={flag} variant="secondary" className="font-mono text-xs">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {n.has_l1_firewall ? (
                      <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {n.has_wg_customers ? (
                      <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />
                    )}
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
    </>
  )
}
