'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  BarChart3,
  Cable,
  Gauge,
  History,
  LayoutDashboard,
  LineChart,
  LogOut,
  Network,
  Radar,
  RefreshCw,
  Server,
  ShieldAlert,
  Shield,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { signOut } from '@/lib/auth/actions'

const OPS_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/nodes', label: 'Nodes', icon: Server },
  { href: '/events', label: 'Events', icon: Activity },
  { href: '/connections', label: 'Live sessions', icon: Network },
  { href: '/sync', label: 'Sync status', icon: RefreshCw },
  { href: '/operations/history', label: 'Job history', icon: History },
] as const

const REPORT_ITEMS = [
  { href: '/reports/connections', label: 'Connections', icon: LineChart },
  { href: '/reports/bandwidth', label: 'Bandwidth', icon: TrendingUp },
  { href: '/reports/node-health', label: 'Node health', icon: Gauge },
  { href: '/reports/handshake', label: 'Handshake', icon: Cable },
  { href: '/reports/probes', label: 'Probes', icon: Radar },
  { href: '/reports/device-rate', label: 'Device rate', icon: BarChart3 },
  { href: '/reports/sni-cert', label: 'SNI cert', icon: ShieldAlert },
] as const

const SETTINGS_ITEM = { href: '/settings', label: 'Settings', icon: Settings } as const

export function AppSidebar({ operatorEmail }: { operatorEmail: string | null }) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">vwision</span>
            <span className="text-xs text-muted-foreground">admin</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {OPS_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {REPORT_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href={SETTINGS_ITEM.href} />}
                  isActive={isActive(SETTINGS_ITEM.href)}
                  tooltip={SETTINGS_ITEM.label}
                >
                  <SETTINGS_ITEM.icon className="h-4 w-4" />
                  <span>{SETTINGS_ITEM.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {operatorEmail && (
          <div className="border-t pt-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="sm" tooltip={operatorEmail}>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                    {operatorEmail.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate text-xs">{operatorEmail}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <form action={signOut} className="w-full">
                  <SidebarMenuButton render={<button type="submit" />} size="sm" tooltip="Sign out">
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </SidebarMenuButton>
                </form>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
