'use client'

// Client-component wrappers around Tremor charts.
//
// Tremor charts are Client Components and accept `valueFormatter` as a function prop.
// In React 19 Server Components, functions can't cross the server/client boundary, so
// the formatter must be created inside a client component. We expose a
// `format: FormatToken` string prop instead — the wrapper maps it to a local function.

import {
  AreaChart as TremorAreaChart,
  BarChart as TremorBarChart,
  DonutChart as TremorDonutChart,
  LineChart as TremorLineChart,
} from '@tremor/react'

export type FormatToken =
  | 'count'        // 1,234
  | 'integer'      // 1234 (no thousand sep)
  | 'ms'           // 123ms
  | 'percent'      // 12.5%
  | 'mbps'         // 12.3 Mbps
  | 'mb'           // 12.3 MB
  | 'bytes'        // 1.2 GB (auto-scaled)
  | 'cert_bytes'   // 4,532B

function pickFormatter(token: FormatToken): (v: number) => string {
  switch (token) {
    case 'count':
      return (v) => v.toLocaleString()
    case 'integer':
      return (v) => Math.round(v).toString()
    case 'ms':
      return (v) => `${Math.round(v)}ms`
    case 'percent':
      return (v) => `${v.toFixed(2)}%`
    case 'mbps':
      return (v) => `${v.toFixed(1)} Mbps`
    case 'mb':
      return (v) => `${v.toFixed(1)} MB`
    case 'cert_bytes':
      return (v) => `${v.toLocaleString()}B`
    case 'bytes':
      return (v) => {
        if (v < 1024) return `${Math.round(v)} B`
        const units = ['KB', 'MB', 'GB', 'TB']
        let n = v / 1024
        let i = 0
        while (n >= 1024 && i < units.length - 1) {
          n /= 1024
          i++
        }
        return `${n.toFixed(n >= 100 ? 0 : 1)} ${units[i]}`
      }
  }
}

interface CommonProps {
  data: Array<Record<string, string | number>>
  index: string
  categories: string[]
  colors?: string[]
  className?: string
  format?: FormatToken
  noDataText?: string
  yAxisWidth?: number
}

export function LineChart({ format = 'count', stack, ...props }: CommonProps & { stack?: boolean }) {
  return (
    <TremorLineChart
      {...props}
      showAnimation={false}
      valueFormatter={pickFormatter(format)}
    />
  )
}

export function AreaChart({ format = 'count', stack, ...props }: CommonProps & { stack?: boolean }) {
  return (
    <TremorAreaChart
      {...props}
      showAnimation={false}
      valueFormatter={pickFormatter(format)}
      stack={stack}
    />
  )
}

export function BarChart({ format = 'count', stack, ...props }: CommonProps & { stack?: boolean }) {
  return (
    <TremorBarChart
      {...props}
      showAnimation={false}
      valueFormatter={pickFormatter(format)}
      stack={stack}
    />
  )
}

interface DonutProps {
  data: Array<Record<string, string | number>>
  index: string
  category: string
  colors?: string[]
  className?: string
  format?: FormatToken | 'donut_label'  // donut_label = "{value} probes"
  noDataText?: string
}

export function DonutChart({ format = 'count', ...props }: DonutProps) {
  const formatter =
    format === 'donut_label'
      ? (v: number) => `${v.toLocaleString()} probes`
      : pickFormatter(format as FormatToken)
  return (
    <TremorDonutChart
      {...props}
      showAnimation={false}
      valueFormatter={formatter}
    />
  )
}
