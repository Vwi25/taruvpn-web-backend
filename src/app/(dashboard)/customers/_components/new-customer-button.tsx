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
import type { OperationKind } from '@/lib/operations/registry'

const FLAVORS: Array<{ value: 'cn' | 'wg' | 'dual'; label: string; description: string; kind: OperationKind }> = [
  {
    value: 'cn',
    label: 'CN (Reality chain)',
    description: 'Inside China — JP-Pro2 entry → metered exits via Mihomo dialer-proxy.',
    kind: 'customer_cn_add',
  },
  {
    value: 'wg',
    label: 'Non-CN (WG direct)',
    description: 'Outside China — direct WireGuard to 4 exit nodes.',
    kind: 'customer_wg_add',
  },
  {
    value: 'dual',
    label: 'Dual (geo-auto /auto/)',
    description: 'Cloudflare cf-ipcountry header serves cn.yaml or noncn.yaml automatically.',
    kind: 'customer_dual_add',
  },
]

export function NewCustomerButton() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [flavor, setFlavor] = React.useState<'cn' | 'wg' | 'dual'>('cn')
  const [name, setName] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const slugValid = /^[a-z0-9_-]{2,40}$/.test(name)

  React.useEffect(() => {
    if (!open) {
      setName('')
      setFlavor('cn')
      setSubmitting(false)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!slugValid || submitting) return
    setSubmitting(true)
    const kind = FLAVORS.find((f) => f.value === flavor)!.kind
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, args: { name } }),
    })
    if (!res.ok) {
      const detail = await res.text()
      toast.error(`Failed: ${detail}`)
      setSubmitting(false)
      return
    }
    const { id } = (await res.json()) as { id: string }
    toast.success('Customer provisioning started', { description: name })
    setOpen(false)
    router.push(`/operations/history/${id}`)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New customer
          </Button>
        }
      />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add customer</SheetTitle>
          <SheetDescription>
            Provisions a new customer across all relevant nodes. Streams output live.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4">
          <div className="space-y-2">
            <Label>Flavor</Label>
            <div className="space-y-2">
              {FLAVORS.map((f) => (
                <label
                  key={f.value}
                  className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 transition ${
                    flavor === f.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="flavor"
                      value={f.value}
                      checked={flavor === f.value}
                      onChange={() => setFlavor(f.value)}
                      className="accent-primary"
                    />
                    <span className="text-sm font-medium">{f.label}</span>
                  </div>
                  <span className="ml-6 text-xs text-muted-foreground">{f.description}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-name">Customer name (slug)</Label>
            <Input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase())}
              placeholder="e.g. alice"
              autoComplete="off"
              spellCheck={false}
              maxLength={40}
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, digits, dash, underscore. 2–40 chars.
            </p>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!slugValid || submitting}>
            {submitting ? 'Submitting…' : 'Provision'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
