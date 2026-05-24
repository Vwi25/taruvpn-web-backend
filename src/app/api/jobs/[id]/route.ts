// GET /api/jobs/[id] — current snapshot of a job (status + full log).
// Useful for the history detail page's initial paint before the SSE
// stream takes over, and for non-streaming clients.

import { NextResponse } from 'next/server'

import { isOperator } from '@/lib/auth/operator'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!isOperator(userData.user)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params

  const admin = await createAdminClient()
  const { data, error } = await admin
    .schema('internal')
    .from('operator_jobs')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json(data)
}
