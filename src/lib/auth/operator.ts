import type { User } from '@supabase/supabase-js'

// Bootstrap fallback — env-listed emails always count as operators.
// Prevents lockout if the role field gets accidentally cleared in Supabase.
function isEnvAllowlisted(email: string | null | undefined): boolean {
  if (!email) return false
  const list = (process.env.OPERATOR_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.toLowerCase())
}

export function isOperator(user: User | null | undefined): boolean {
  if (!user) return false
  if (user.app_metadata?.role === 'operator') return true
  return isEnvAllowlisted(user.email)
}
