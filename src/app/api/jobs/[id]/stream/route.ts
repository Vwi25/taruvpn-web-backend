// GET /api/jobs/[id]/stream — Server-Sent Events feed of job log.
//
// Polls Supabase every 400ms for new log entries + status. Emits two
// kinds of events:
//   - `log`     {ts, stream, line}
//   - `status`  {status, exit_code}
//
// Closes the stream once status ∈ {succeeded, failed}.
//
// 400ms is a compromise: tighter feels live; looser saves Supabase
// reads. Scripts emit at most a few lines per second.

import { isOperator } from '@/lib/auth/operator'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const POLL_MS = 400
const MAX_DURATION_MS = 10 * 60 * 1000 // safety: 10 min hard cap

interface LogEntry {
  ts: string
  stream: 'stdout' | 'stderr'
  line: string
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!isOperator(userData.user)) {
    return new Response('unauthorized', { status: 401 })
  }

  const { id } = await ctx.params
  const admin = await createAdminClient()

  const encoder = new TextEncoder()
  let lastSentIndex = 0
  let lastStatus = ''
  const startedAt = Date.now()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        )
      }

      // Initial paint: full snapshot of log so far.
      const { data: snap } = await admin
        .schema('internal')
        .from('operator_jobs')
        .select('status, exit_code, log')
        .eq('id', id)
        .maybeSingle()

      if (!snap) {
        send('error', { message: 'not_found' })
        controller.close()
        return
      }

      const initialLog = (snap.log as LogEntry[]) ?? []
      for (const entry of initialLog) send('log', entry)
      lastSentIndex = initialLog.length
      lastStatus = snap.status
      send('status', { status: snap.status, exit_code: snap.exit_code })

      if (snap.status === 'succeeded' || snap.status === 'failed') {
        controller.close()
        return
      }

      const interval = setInterval(async () => {
        if (Date.now() - startedAt > MAX_DURATION_MS) {
          send('error', { message: 'stream_timeout' })
          clearInterval(interval)
          controller.close()
          return
        }

        const { data } = await admin
          .schema('internal')
          .from('operator_jobs')
          .select('status, exit_code, log')
          .eq('id', id)
          .maybeSingle()

        if (!data) return
        const log = (data.log as LogEntry[]) ?? []
        for (let i = lastSentIndex; i < log.length; i++) {
          send('log', log[i])
        }
        lastSentIndex = log.length

        if (data.status !== lastStatus) {
          send('status', { status: data.status, exit_code: data.exit_code })
          lastStatus = data.status
          if (data.status === 'succeeded' || data.status === 'failed') {
            clearInterval(interval)
            controller.close()
          }
        }
      }, POLL_MS)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
