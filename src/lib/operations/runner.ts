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
//
// Post-job sync: after a successful customer or device op, we run
// the connector's idempotent re-import so internal.vpn_customers /
// vpn_devices reflect the new disk + SQLite state. Without this the
// admin list page would stay stale until the operator manually ran
// the import script — the very thing the web admin is supposed to
// replace.

import { spawn } from 'node:child_process'

import { createAdminClient } from '@/lib/supabase/server'

import { REGISTRY, type OperationKind } from './registry'

const CWD = '/home/vwision'
const CONNECTOR_DIR = '/home/vwision/taruvpn-db-connector'
const CONNECTOR_PYTHON = `${CONNECTOR_DIR}/venv/bin/python`

const MAX_LOG_LINES = 10_000

// Which connector import scripts to run after each kind of job.
// Customer ops modify YAML/CSV → csv_yaml import.
// Device ops modify vpn.db SQLite → sqlite import.
function postSyncScripts(kind: OperationKind): string[] {
  if (kind.startsWith('customer_')) {
    return ['scripts/import_csv_yaml_once.py']
  }
  if (kind.startsWith('device_')) {
    return ['scripts/import_sqlite_once.py']
  }
  return []
}

export async function runJob(jobId: string, kind: OperationKind, argv: string[]) {
  const sb = await createAdminClient()
  const def = REGISTRY[kind]

  await sb.schema('internal').from('operator_jobs').update({
    status: 'running',
    started_at: new Date().toISOString(),
  }).eq('id', jobId)

  // --- helpers shared by the main script + post-sync ----------------------

  let lineCount = 0
  let truncated = false

  const flushLine = async (stream: 'stdout' | 'stderr', line: string) => {
    if (lineCount >= MAX_LOG_LINES) {
      if (!truncated) {
        truncated = true
        await rpcAppend(sb, jobId, {
          ts: new Date().toISOString(),
          stream: 'stderr',
          line: `[runner] log truncated at ${MAX_LOG_LINES} lines`,
        })
      }
      return
    }
    lineCount++
    await rpcAppend(sb, jobId, {
      ts: new Date().toISOString(),
      stream,
      line,
    })
  }

  const spawnAndStream = (cmd: string, args: string[], cwd: string): Promise<number> => {
    return new Promise((resolve) => {
      const child = spawn(cmd, args, {
        cwd,
        env: { ...process.env, NO_COLOR: '1', TERM: 'dumb' },
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      child.stdin.write('y\n')
      child.stdin.end()

      const onChunk = (stream: 'stdout' | 'stderr') => (chunk: Buffer) => {
        const text = chunk.toString('utf8').replace(/\r/g, '')
        for (const line of text.split('\n')) {
          if (line.length === 0) continue
          void flushLine(stream, line)
        }
      }
      child.stdout.on('data', onChunk('stdout'))
      child.stderr.on('data', onChunk('stderr'))

      child.on('close', (code) => resolve(code ?? -1))
      child.on('error', async (err) => {
        await flushLine('stderr', `[runner] spawn error (${cmd}): ${err.message}`)
        resolve(-1)
      })
    })
  }

  // --- main script ---------------------------------------------------------

  const exitCode = await spawnAndStream(def.script, argv, CWD)

  // --- post-sync (only on success) ----------------------------------------

  if (exitCode === 0) {
    for (const script of postSyncScripts(kind)) {
      await flushLine('stdout', `[runner] post-sync: ${script}`)
      const syncCode = await spawnAndStream(
        CONNECTOR_PYTHON,
        [script],
        CONNECTOR_DIR,
      )
      if (syncCode !== 0) {
        await flushLine(
          'stderr',
          `[runner] post-sync FAILED (exit=${syncCode}) — Supabase mirror is now stale`,
        )
      }
    }
  }

  await sb.schema('internal').from('operator_jobs').update({
    status: exitCode === 0 ? 'succeeded' : 'failed',
    exit_code: exitCode,
    finished_at: new Date().toISOString(),
  }).eq('id', jobId)
}

// Atomic log-line append. Lives in internal schema, so the JS client
// has to be told (default targets public). Errors are surfaced into
// the job log itself the first time they happen — silent swallowing
// here is exactly how the empty-log bug shipped.
let rpcErrorLogged = false
async function rpcAppend(
  sb: Awaited<ReturnType<typeof createAdminClient>>,
  jobId: string,
  entry: { ts: string; stream: 'stdout' | 'stderr'; line: string },
) {
  const { error } = await sb.schema('internal').rpc('append_job_log', {
    p_job_id: jobId,
    p_entry: entry,
  })
  if (error && !rpcErrorLogged) {
    rpcErrorLogged = true
    console.error('[runner] append_job_log failed:', error)
  }
}

