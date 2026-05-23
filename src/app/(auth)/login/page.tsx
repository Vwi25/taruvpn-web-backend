import Link from 'next/link'
import { Shield } from 'lucide-react'

import { signInWithPassword } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'This email is not on the operator allowlist.',
  missing_fields: 'Please enter both email and password.',
  Invalid_login_credentials: 'Invalid email or password.',
  'Invalid login credentials': 'Invalid email or password.',
}

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next = '/', error: errorKey } = await searchParams
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] ?? decodeURIComponent(errorKey) : null

  return (
    <Card>
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Shield className="h-5 w-5" />
        </div>
        <CardTitle className="text-xl">vwision admin</CardTitle>
        <CardDescription>Operator sign-in. Allowlist enforced.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signInWithPassword} className="space-y-4">
          <input type="hidden" name="next" value={next} />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {errorMessage && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Forgot your password? Reset via{' '}
          <Link
            href="https://supabase.com/dashboard/project/monuytpwaelmajboeseo/auth/users"
            className="underline underline-offset-2 hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            Supabase Studio
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  )
}
