// POST /api/jobs — enqueue an operator job.
//
// Body: { kind: OperationKind, args: object }
// Returns: { id: string } so the UI can navigate to the live log.
//
// The actual child process is started via runJob() but NOT awaited —
// this keeps the POST under 100ms regardless of how long the script
// takes. The client then opens an SSE stream at /api/jobs/[id]/stream
// to watch output land.

import { NextResponse } from 'next/server'

import { isOperator } from '@/lib/auth/operator'
import { REGISTRY, isOperationKind } from '@/lib/operations/registry'
import { runJob } from '@/lib/operations/runner'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!isOperator(userData.user)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { kind, args } = (body ?? {}) as { kind?: unknown; args?: unknown }

  if (typeof kind !== 'string' || !isOperationKind(kind)) {
    return NextResponse.json({ error: 'unknown_kind', kind }, { status: 400 })
  }

  const def = REGISTRY[kind]
  const parsed = def.argsSchema.safeParse(args ?? {})
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_args', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const argv = def.toArgv(parsed.data)

  const admin = await createAdminClient()
  const { data: job, error } = await admin
    .schema('internal')
    .from('operator_jobs')
    .insert({
      kind,
      args: parsed.data,
      operator_id: userData.user!.id,
      operator_email: userData.user!.email ?? 'unknown',
    })
    .select('id')
    .single()

  if (error || !job) {
    return NextResponse.json(
      { error: 'insert_failed', detail: error?.message },
      { status: 500 },
    )
  }

  // Fire-and-forget. Catch is just to keep the unhandled-rejection
  // dragon away — runJob() already writes any error into the log.
  void runJob(job.id, kind, argv).catch(() => {})

  return NextResponse.json({ id: job.id }, { status: 202 })
}
