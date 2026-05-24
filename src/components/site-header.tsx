'use client'

import { usePathname } from 'next/navigation'

import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/nodes': 'Nodes',
  '/events': 'Events',
  '/connections': 'Live sessions',
  '/sync': 'Sync status',
  '/settings': 'Settings',
  '/reports': 'Reports',
  '/reports/connections': 'Connections',
  '/reports/bandwidth': 'Bandwidth',
  '/reports/node-health': 'Node health',
  '/reports/handshake': 'Handshake',
  '/reports/probes': 'Probes',
  '/reports/device-rate': 'Device rate',
  '/reports/sni-cert': 'SNI cert',
  '/operations/history': 'Job history',
}

function getTitle(pathname: string): string {
  // Progressive prefix match: full path → drop last segment → ... → first segment.
  // Handles nested dynamic routes like /operations/history/[id] → "Job history".
  const segments = pathname.split('/').filter(Boolean)
  for (let n = segments.length; n > 0; n--) {
    const key = '/' + segments.slice(0, n).join('/')
    if (ROUTE_TITLES[key]) return ROUTE_TITLES[key]
  }
  return ROUTE_TITLES[pathname] ?? 'Dashboard'
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = getTitle(pathname)

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-sm font-medium text-muted-foreground">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  )
}
