'use client'

import { AlertTriangle, RotateCw } from 'lucide-react'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error boundary:', error)
  }, [error])

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-destructive/10 p-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-base">Something went wrong</CardTitle>
            <CardDescription>
              {error.message || 'An unexpected error occurred while loading this page.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">Error ID: {error.digest}</p>
        )}
        <Button onClick={reset} variant="outline" className="gap-2">
          <RotateCw className="h-4 w-4" />
          Try again
        </Button>
      </CardContent>
    </Card>
  )
}
