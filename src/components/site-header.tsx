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
}

function getTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  const segment = pathname.split('/')[1]
  return ROUTE_TITLES[`/${segment}`] ?? 'Dashboard'
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
