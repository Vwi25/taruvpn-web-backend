// Server-side proxy for the NPM node-health aggregator.
//
// Browser-side consumers (e.g. future client-polling UIs) hit /api/health here
// instead of talking to the aggregator directly. Server-side pages can also use
// this OR fetch the aggregator URL directly (faster — saves one hop).
//
// Auth: only operators. Non-operators get 403.

import { NextResponse } from 'next/server'

import { isOperator } from '@/lib/auth/operator'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const AGGREGATOR_URL =
  process.env.NPM_AGGREGATOR_URL ?? 'http://127.0.0.1:8088'

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!isOperator(data.user)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const upstream = await fetch(`${AGGREGATOR_URL}/api/v1/nodes/health`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      // 4s — aggregator responds in <50ms; long timeout means the aggregator is down
      signal: AbortSignal.timeout(4000),
    })
    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'aggregator_error', status: upstream.status },
        { status: 502 },
      )
    }
    const body = await upstream.json()
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: 'aggregator_unreachable',
        message: err instanceof Error ? err.message : String(err),
        url: AGGREGATOR_URL,
      },
      { status: 503 },
    )
  }
}
