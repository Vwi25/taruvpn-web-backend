// Browser-side Supabase client. Safe to use in 'use client' components.
// Reads NEXT_PUBLIC_* env vars (bundled into client JS).

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
