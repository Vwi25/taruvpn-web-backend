import { LogOut } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { signOut } from '@/lib/auth/actions'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <PageHeader title="Settings" description="Operator preferences and session info." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription>Theme adapts to system preference by default.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Toggle theme</span>
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operator session</CardTitle>
            <CardDescription>
              Signed in via Supabase Auth. Allowlist enforced by middleware.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {user ? (
              <>
                <dl className="space-y-1">
                  <div className="grid grid-cols-3">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="col-span-2 font-mono text-xs">{user.email}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-muted-foreground">User ID</dt>
                    <dd className="col-span-2 font-mono text-xs">{user.id}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-muted-foreground">Last sign-in</dt>
                    <dd className="col-span-2 text-xs">
                      {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : '—'}
                    </dd>
                  </div>
                </dl>
                <form action={signOut}>
                  <Button type="submit" variant="outline" size="sm" className="gap-2">
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                </form>
              </>
            ) : (
              <p className="text-muted-foreground">Not signed in.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      <div className="text-xs text-muted-foreground">
        <p>
          vwision admin · Next.js 14 · Supabase ·{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">internal.*</code> via service role
        </p>
      </div>
    </>
  )
}
