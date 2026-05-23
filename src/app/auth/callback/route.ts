// OAuth / email-link callback. Used by Google sign-in.

import { NextResponse } from 'next/server'

import { isOperator } from '@/lib/auth/operator'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=callback_missing_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  // OAuth bypasses the form-level operator check — enforce it here.
  // Otherwise any Google user could sign in once the provider is enabled.
  if (!isOperator(data.user)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=unauthorized`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
