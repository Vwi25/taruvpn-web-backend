import Link from 'next/link'
import { Shield } from 'lucide-react'

import { signInWithGoogle, signInWithPassword } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'This email is not on the operator allowlist.',
  missing_fields: 'Please enter both email and password.',
  Invalid_login_credentials: 'Invalid email or password.',
  'Invalid login credentials': 'Invalid email or password.',
  oauth_init_failed: 'Could not start Google sign-in. Try again or use password.',
  callback_missing_code: 'OAuth callback was missing a code. Try again.',
  callback_failed: 'OAuth callback failed. Try again.',
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
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
        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next} />
          <Button type="submit" variant="outline" className="w-full gap-2">
            <GoogleIcon />
            Continue with Google
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

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
