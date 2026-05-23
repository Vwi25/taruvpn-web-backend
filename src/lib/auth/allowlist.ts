export function isAllowlistedEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const list = (process.env.OPERATOR_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.toLowerCase())
}
