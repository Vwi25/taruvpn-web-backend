'use client'

// SSE-subscribed live log. Renders each line as it lands, auto-scrolls
// to bottom, and surfaces stream state (running/succeeded/failed).

import * as React from 'react'

import { JobStatusBadge, type JobStatus } from './job-status-badge'

interface LogEntry {
  ts: string
  stream: 'stdout' | 'stderr'
  line: string
}

interface StatusEvent {
  status: JobStatus
  exit_code: number | null
}

export function LogViewer({ jobId, initialStatus }: { jobId: string; initialStatus: JobStatus }) {
  const [entries, setEntries] = React.useState<LogEntry[]>([])
  const [status, setStatus] = React.useState<JobStatus>(initialStatus)
  const [exitCode, setExitCode] = React.useState<number | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const es = new EventSource(`/api/jobs/${jobId}/stream`)

    es.addEventListener('log', (evt) => {
      const entry = JSON.parse((evt as MessageEvent).data) as LogEntry
      setEntries((prev) => [...prev, entry])
    })
    es.addEventListener('status', (evt) => {
      const s = JSON.parse((evt as MessageEvent).data) as StatusEvent
      setStatus(s.status)
      setExitCode(s.exit_code)
      if (s.status === 'succeeded' || s.status === 'failed') {
        es.close()
      }
    })
    es.addEventListener('error', () => {
      // SSE auto-reconnect handles transient errors. On close from
      // server (terminal status), this fires too — that's fine.
    })

    return () => es.close()
  }, [jobId])

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [entries.length])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <JobStatusBadge status={status} />
        {exitCode !== null && <span className="font-mono">exit={exitCode}</span>}
        <span className="ml-auto font-mono">{entries.length} lines</span>
      </div>
      <div
        ref={scrollRef}
        className="h-[28rem] overflow-y-auto rounded-md border border-border bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-200"
      >
        {entries.length === 0 ? (
          <span className="text-zinc-500">Waiting for output…</span>
        ) : (
          entries.map((e, i) => (
            <div
              key={i}
              className={
                e.stream === 'stderr'
                  ? 'whitespace-pre-wrap text-rose-400'
                  : 'whitespace-pre-wrap text-zinc-200'
              }
            >
              {e.line}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
