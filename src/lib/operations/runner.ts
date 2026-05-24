// Spawn an operator script + stream its stdout/stderr into the job row.
//
// Runs in-process inside the Next.js server (no separate worker). The
// route handler that calls runJob() should NOT await it — it returns a
// promise that resolves when the child exits. Fire-and-forget keeps
// the POST /api/jobs response under 100ms; the UI subscribes to the
// SSE stream for the live log.
//
// Stdin is piped + closed after writing "y\n" once. That auto-answers
// any single `read -p "...y/N"` prompt in the underlying shell scripts
// (e.g. customers/cn/remove.sh) without us having to add a --yes flag
// to every script. Non-interactive scripts ignore the input. The
// trailing newline is harmless.

import { spawn } from 'node:child_process'

import { createAdminClient } from '@/lib/supabase/server'

import { REGISTRY, type OperationKind } from './registry'

const CWD = '/home/vwision'

// Hard cap so a runaway script can't bloat the jobs table.
const MAX_LOG_LINES = 10_000

export async function runJob(jobId: string, kind: OperationKind, argv: string[]) {
  const sb = await createAdminClient()
  const def = REGISTRY[kind]

  await sb.schema('internal').from('operator_jobs').update({
    status: 'running',
    started_at: new Date().toISOString(),
  }).eq('id', jobId)

  const child = spawn(def.script, argv, {
    cwd: CWD,
    env: { ...process.env, NO_COLOR: '1', TERM: 'dumb' },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  // Pre-answer any (y/N) prompt then close stdin so non-interactive
  // scripts see EOF and proceed normally.
  child.stdin.write('y\n')
  child.stdin.end()

  let lineCount = 0
  let truncated = false

  const flushLine = async (stream: 'stdout' | 'stderr', line: string) => {
    if (lineCount >= MAX_LOG_LINES) {
      if (!truncated) {
        truncated = true
        try {
          await sb.rpc('append_job_log', {
            p_job_id: jobId,
            p_entry: {
              ts: new Date().toISOString(),
              stream: 'stderr',
              line: `[runner] log truncated at ${MAX_LOG_LINES} lines`,
            },
          })
        } catch {}
      }
      return
    }
    lineCount++
    try {
      await sb.rpc('append_job_log', {
        p_job_id: jobId,
        p_entry: { ts: new Date().toISOString(), stream, line },
      })
    } catch {}
  }

  // Split incoming chunks on \n. Chunks may end mid-line, but for
  // the volume scripts produce (<500 lines, mostly short) we accept
  // occasional split lines — the log viewer still renders cleanly.
  const onChunk = (stream: 'stdout' | 'stderr') => (chunk: Buffer) => {
    const text = chunk.toString('utf8').replace(/\r/g, '')
    for (const line of text.split('\n')) {
      if (line.length === 0) continue
      void flushLine(stream, line)
    }
  }

  child.stdout.on('data', onChunk('stdout'))
  child.stderr.on('data', onChunk('stderr'))

  const exitCode = await new Promise<number>((resolve) => {
    child.on('close', (code) => resolve(code ?? -1))
    child.on('error', async (err) => {
      await flushLine('stderr', `[runner] spawn error: ${err.message}`)
      resolve(-1)
    })
  })

  await sb.schema('internal').from('operator_jobs').update({
    status: exitCode === 0 ? 'succeeded' : 'failed',
    exit_code: exitCode,
    finished_at: new Date().toISOString(),
  }).eq('id', jobId)
}
