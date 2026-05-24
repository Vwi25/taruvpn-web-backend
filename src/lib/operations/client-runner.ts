'use client'

// Client-side helper: POST /api/jobs, surface progress as a sonner toast
// (loading → success/failed), and refresh the current route once the
// server-rendered data is fresh (post-sync done). The toast carries a
// "View" action that jumps to the live log.
//
// Use in any client component that triggers an op — keeps the UX
// consistent and the call sites tiny.

import type { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import type { OperationKind } from './registry'

const POLL_MS = 1500
const MAX_POLL_MS = 5 * 60 * 1000 // 5 minutes

interface EnqueueOpts {
  router: ReturnType<typeof useRouter>
  /** What gets shown in the loading/success/failed toast. */
  label: string
  /** Sub-line below the toast title (e.g. customer slug). */
  description?: string
}

interface JobSnapshot {
  status: 'pending' | 'running' | 'succeeded' | 'failed'
  exit_code: number | null
}

export async function enqueueAndTrack(
  kind: OperationKind,
  args: Record<string, unknown>,
  opts: EnqueueOpts,
) {
  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, args }),
  })
  if (!res.ok) {
    toast.error(`Failed to queue ${opts.label}`, {
      description: await res.text(),
    })
    return null
  }

  const { id } = (await res.json()) as { id: string }
  const viewAction = {
    label: 'View',
    onClick: () => opts.router.push(`/operations/history/${id}`),
  }

  const toastId = toast.loading(opts.label, {
    description: opts.description,
    action: viewAction,
  })

  // Poll until terminal status. Stop after MAX_POLL_MS as a safety net —
  // the SSE stream on /operations/history/[id] still works either way.
  const startedAt = Date.now()
  const poll = setInterval(async () => {
    if (Date.now() - startedAt > MAX_POLL_MS) {
      clearInterval(poll)
      toast.warning(`${opts.label} — still running`, {
        id: toastId,
        description: 'Open the job log to follow it.',
        action: viewAction,
      })
      return
    }
    try {
      const r = await fetch(`/api/jobs/${id}`)
      if (!r.ok) return
      const job = (await r.json()) as JobSnapshot
      if (job.status === 'succeeded') {
        clearInterval(poll)
        toast.success(opts.label, {
          id: toastId,
          description: opts.description,
          action: viewAction,
        })
        // Post-sync has completed by now (runner runs it before
        // flipping status). Re-fetch the server-component data so
        // the page reflects the new state.
        opts.router.refresh()
      } else if (job.status === 'failed') {
        clearInterval(poll)
        toast.error(`${opts.label} — failed (exit=${job.exit_code ?? '?'})`, {
          id: toastId,
          description: opts.description,
          action: viewAction,
        })
      }
    } catch {
      // network blip — next tick will retry
    }
  }, POLL_MS)

  return id
}
