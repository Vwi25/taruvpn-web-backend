'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'
import { Power, PowerOff, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { TypeToConfirmDialog } from '@/components/operations/type-to-confirm-dialog'
import { enqueueAndTrack } from '@/lib/operations/client-runner'
import { REGISTRY, type OperationKind } from '@/lib/operations/registry'

export function DeviceActions({
  customer,
  device,
  status,
}: {
  customer: string
  device: string
  status: string
}) {
  const router = useRouter()
  const [confirmAction, setConfirmAction] = React.useState<
    null | { kind: OperationKind; label: string }
  >(null)

  const enqueue = (kind: OperationKind) =>
    enqueueAndTrack(kind, { customer, device }, {
      router,
      label: REGISTRY[kind].label,
      description: `${customer}/${device}`,
    })

  const enqueueDirect = (kind: OperationKind) => () => void enqueue(kind)

  return (
    <>
      <div className="flex justify-end gap-1">
        {status === 'disabled' || status === 'pending' ? (
          <Button
            variant="ghost"
            size="icon-sm"
            title="Enable"
            onClick={enqueueDirect('device_enable')}
          >
            <Power className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </Button>
        ) : status === 'active' ? (
          <Button
            variant="ghost"
            size="icon-sm"
            title="Disable"
            onClick={() =>
              setConfirmAction({ kind: 'device_disable', label: 'Disable device' })
            }
          >
            <PowerOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </Button>
        ) : null}
        {status !== 'revoked' && (
          <Button
            variant="ghost"
            size="icon-sm"
            title="Revoke (permanent)"
            onClick={() =>
              setConfirmAction({
                kind: 'device_revoke',
                label: 'Revoke (permanent)',
              })
            }
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>

      {confirmAction && (
        <TypeToConfirmDialog
          open={!!confirmAction}
          onOpenChange={(o) => !o && setConfirmAction(null)}
          title={`${confirmAction.label}: ${customer}/${device}`}
          description={
            confirmAction.kind === 'device_revoke'
              ? 'Permanently revokes this device identity. Cannot be re-enabled.'
              : 'Removes device from all xray nodes. Can be re-enabled later.'
          }
          confirmText={device}
          confirmLabel={confirmAction.label}
          onConfirm={async () => {
            await enqueue(confirmAction.kind)
          }}
        />
      )}
    </>
  )
}
