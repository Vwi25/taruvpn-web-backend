'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export function AddDeviceButton({ customer }: { customer: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [deviceName, setDeviceName] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setDeviceName('')
      setSubmitting(false)
    }
  }, [open])

  const valid = deviceName === '' || /^[a-zA-Z0-9_-]{1,40}$/.test(deviceName)

  const handleSubmit = async () => {
    if (!valid || submitting) return
    setSubmitting(true)
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'device_add',
        args: deviceName ? { customer, device: deviceName } : { customer },
      }),
    })
    if (!res.ok) {
      toast.error(`Failed: ${await res.text()}`)
      setSubmitting(false)
      return
    }
    const { id } = (await res.json()) as { id: string }
    setOpen(false)
    router.push(`/operations/history/${id}`)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4" />
            Add device
          </Button>
        }
      />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add device for {customer}</SheetTitle>
          <SheetDescription>
            Stages a pending per-device UUID + subscription. Does NOT add to xray
            nodes yet — run Enable separately.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 space-y-3">
          <Label htmlFor="dev-name">Device name (optional)</Label>
          <Input
            id="dev-name"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="e.g. phone1 (auto-generated if blank)"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            Letters, digits, dash, underscore. Leave blank for{' '}
            <code className="font-mono">device1</code> / <code className="font-mono">device2</code>… auto-numbering.
          </p>
        </div>
        <SheetFooter className="flex-row gap-2 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || submitting}>
            {submitting ? 'Submitting…' : 'Stage device'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
