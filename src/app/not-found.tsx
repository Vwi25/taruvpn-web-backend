import Link from 'next/link'
import { Compass } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Compass className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or was moved.
          </p>
        </div>
        <Button render={<Link href="/" />} variant="outline">
          Go to dashboard
        </Button>
      </div>
    </div>
  )
}
