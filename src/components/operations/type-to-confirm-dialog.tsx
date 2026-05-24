'use client'

// GitHub-style destructive confirmation. User must type the exact
// resource name before the action button enables.
//
// Usage:
//   <TypeToConfirmDialog
//     open={open} onOpenChange={setOpen}
//     title="Remove customer alice"
//     description="Wipes YAML, removes from all nodes."
//     confirmText="alice"
//     confirmLabel="Remove customer"
//     onConfirm={async () => { ... }}
//   />

import * as React from 'react'

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
} from '@/components/ui/sheet'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmText: string
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
}

export function TypeToConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  confirmLabel = 'Confirm',
  onConfirm,
}: Props) {
  const [typed, setTyped] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setTyped('')
      setSubmitting(false)
    }
  }, [open])

  const matches = typed === confirmText

  const handleConfirm = async () => {
    if (!matches || submitting) return
    setSubmitting(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="px-4 space-y-3">
          <Label htmlFor="ttc-confirm">
            Type <span className="font-mono text-foreground">{confirmText}</span> to confirm
          </Label>
          <Input
            id="ttc-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder={confirmText}
          />
        </div>
        <SheetFooter className="flex-row gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!matches || submitting}
            onClick={handleConfirm}
          >
            {submitting ? 'Running…' : confirmLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
