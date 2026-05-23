// Supabase session refresh + operator allowlist gate for Next.js middleware.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/auth/callback']
const STATIC_PATTERNS = [/^\/_next\//, /^\/favicon/, /^\/fonts\//]

function isAllowlistedEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const list = (process.env.OPERATOR_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.toLowerCase())
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isStatic = STATIC_PATTERNS.some((re) => re.test(path))
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`))

  if (isStatic) return supabaseResponse

  // Already signed in + on /login → redirect home (only if allowlisted)
  if (path === '/login' && user && isAllowlistedEmail(user.email)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (isPublic) return supabaseResponse

  // Protected route — must be signed in AND on operator allowlist
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    if (path !== '/') loginUrl.searchParams.set('next', path)
    return NextResponse.redirect(loginUrl)
  }

  if (!isAllowlistedEmail(user.email)) {
    // Signed in but not an operator — sign out + show error
    await supabase.auth.signOut()
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}
