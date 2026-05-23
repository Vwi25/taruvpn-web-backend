// Server-side Supabase client for Next.js Server Components + API routes.
//
// Reads cookies (so RLS sees authenticated users when signed in via @supabase/ssr).
// Use this in any `async` server component, route handler, or middleware.
//
// For *admin* operations that must bypass RLS (e.g. reading internal.* tables),
// use createAdminClient() instead — it uses the service role key.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Standard server client — uses authenticated user session via cookies.
 * Respects RLS. Use for customer-facing pages.
 *
 * Must be awaited (Next 15+ made cookies() async).
 */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Server Components can't write cookies; middleware will refresh session
        }
      },
    },
  })
}

/**
 * Admin client — uses service role key. BYPASSES RLS.
 * Use only in server-side code for operator-only operations
 * (e.g. reading internal.* operational tables).
 * NEVER pass this client to browser code.
 *
 * Marked async for API consistency with createClient() (Next 15+ migration).
 */
export async function createAdminClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing in .env.local')
  }
  return createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  })
}
