'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'
import { MoreHorizontal, RefreshCw, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TypeToConfirmDialog } from '@/components/operations/type-to-confirm-dialog'
import { enqueueAndTrack } from '@/lib/operations/client-runner'
import { REGISTRY, type OperationKind } from '@/lib/operations/registry'

interface Props {
  slug: string
  customerType: string // 'cn' | 'wg' | 'dual' (anything else → no actions)
}

function kindsFor(type: string): { regenerate?: OperationKind; remove?: OperationKind } {
  switch (type) {
    case 'cn':
      return { regenerate: 'customer_cn_regenerate', remove: 'customer_cn_remove' }
    case 'wg':
      return { regenerate: 'customer_wg_regenerate', remove: 'customer_wg_remove' }
    case 'dual':
      return { regenerate: 'customer_dual_regenerate', remove: 'customer_dual_remove' }
    default:
      return {}
  }
}

export function CustomerRowActions({ slug, customerType }: Props) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const { regenerate, remove } = kindsFor(customerType)

  if (!regenerate && !remove) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const fire = (kind: OperationKind) =>
    enqueueAndTrack(kind, { name: slug }, {
      router,
      label: REGISTRY[kind].label,
      description: slug,
    })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {regenerate && (
            <DropdownMenuItem onClick={() => void fire(regenerate)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </DropdownMenuItem>
          )}
          {remove && (
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {remove && (
        <TypeToConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Remove customer ${slug}`}
          description="Wipes YAML, removes from all xray + WG nodes. Devices are removed too. Cannot be undone."
          confirmText={slug}
          confirmLabel="Remove customer"
          onConfirm={async () => {
            await fire(remove)
          }}
        />
      )}
    </>
  )
}
