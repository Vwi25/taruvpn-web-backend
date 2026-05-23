'use client'

// Recharts-based chart wrappers themed with shadcn CSS variables.
// Same API as before (drop-in for the old Tremor wrappers) so report pages
// don't need to change.
//
// Why Recharts instead of Tremor:
// - Tremor v3 requires custom `tremor-*` Tailwind tokens we never registered,
//   causing SVG strokes to render with no color (invisible lines).
// - Recharts uses inline SVG attributes, picks up any color we pass.
// - Better dark-mode rendering with our existing CSS variables.

import * as React from 'react'
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type FormatToken =
  | 'count'        // 1,234
  | 'integer'      // 1234
  | 'ms'           // 123ms
  | 'percent'      // 12.50%
  | 'mbps'         // 12.3 Mbps
  | 'mb'           // 12.3 MB
  | 'bytes'        // 1.2 GB (auto)
  | 'cert_bytes'   // 4,532B
  | 'donut_label'  // {n} probes

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
    case 'donut_label':
      return (v) => `${v.toLocaleString()} probes`
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

// Named Tailwind palette → hex (Recharts needs CSS color values, not class names).
// Using 500-tier for both modes — Tailwind 500 has good contrast on light + dark.
const PALETTE: Record<string, string> = {
  blue: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
  orange: '#f97316',
  gray: '#6b7280',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
}

function resolveColor(name: string, fallback: string): string {
  return PALETTE[name] ?? fallback
}

// Custom tooltip styled with shadcn theme colors via Tailwind classes.
function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  formatter: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover/95 backdrop-blur p-2.5 text-xs shadow-md">
      {label && <div className="mb-1.5 font-medium text-muted-foreground">{label}</div>}
      <div className="space-y-0.5">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: p.color }}
            />
            <span className="flex-1 text-foreground">{p.name}</span>
            <span className="ml-3 font-mono tabular-nums text-foreground">
              {formatter(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface SeriesChartProps {
  data: Array<Record<string, string | number>>
  index: string
  categories: string[]
  colors?: string[]
  className?: string
  format?: FormatToken
  noDataText?: string
  yAxisWidth?: number
  stack?: boolean
}

const AXIS_STYLE = {
  fontSize: 11,
  fill: 'currentColor',
}

const GRID_PROPS = {
  stroke: 'currentColor',
  strokeOpacity: 0.1,
  vertical: false,
}

export function LineChart({
  data,
  index,
  categories,
  colors = [],
  className,
  format = 'count',
  noDataText = 'No data',
  yAxisWidth = 48,
}: SeriesChartProps) {
  const formatter = pickFormatter(format)
  if (!data.length) {
    return <div className={`flex items-center justify-center text-sm text-muted-foreground ${className}`}>{noDataText}</div>
  }
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey={index} tick={AXIS_STYLE} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={32} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={yAxisWidth} tickFormatter={formatter} />
          <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ stroke: 'currentColor', strokeOpacity: 0.2 }} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
          {categories.map((cat, i) => (
            <Line
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={resolveColor(colors[i] ?? 'blue', '#3b82f6')}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AreaChart({
  data,
  index,
  categories,
  colors = [],
  className,
  format = 'count',
  noDataText = 'No data',
  yAxisWidth = 48,
  stack = false,
}: SeriesChartProps) {
  const formatter = pickFormatter(format)
  if (!data.length) {
    return <div className={`flex items-center justify-center text-sm text-muted-foreground ${className}`}>{noDataText}</div>
  }
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey={index} tick={AXIS_STYLE} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={32} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={yAxisWidth} tickFormatter={formatter} />
          <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ stroke: 'currentColor', strokeOpacity: 0.2 }} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
          {categories.map((cat, i) => {
            const color = resolveColor(colors[i] ?? 'blue', '#3b82f6')
            return (
              <Area
                key={cat}
                type="monotone"
                dataKey={cat}
                stackId={stack ? 'stack' : undefined}
                stroke={color}
                fill={color}
                fillOpacity={0.3}
                strokeWidth={2}
                isAnimationActive={false}
              />
            )
          })}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BarChart({
  data,
  index,
  categories,
  colors = [],
  className,
  format = 'count',
  noDataText = 'No data',
  yAxisWidth = 48,
  stack = false,
}: SeriesChartProps) {
  const formatter = pickFormatter(format)
  if (!data.length) {
    return <div className={`flex items-center justify-center text-sm text-muted-foreground ${className}`}>{noDataText}</div>
  }
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey={index} tick={AXIS_STYLE} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={32} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={yAxisWidth} tickFormatter={formatter} />
          <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ fill: 'currentColor', fillOpacity: 0.05 }} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
          {categories.map((cat, i) => (
            <Bar
              key={cat}
              dataKey={cat}
              fill={resolveColor(colors[i] ?? 'blue', '#3b82f6')}
              stackId={stack ? 'stack' : undefined}
              isAnimationActive={false}
              radius={stack ? 0 : [2, 2, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface DonutProps {
  data: Array<Record<string, string | number>>
  index: string
  category: string
  colors?: string[]
  className?: string
  format?: FormatToken
  noDataText?: string
}

export function DonutChart({
  data,
  index,
  category,
  colors = [],
  className,
  format = 'count',
  noDataText = 'No data',
}: DonutProps) {
  const formatter = pickFormatter(format)
  if (!data.length) {
    return <div className={`flex items-center justify-center text-sm text-muted-foreground ${className}`}>{noDataText}</div>
  }
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={data}
            dataKey={category}
            nameKey={index}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={2}
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={resolveColor(colors[i] ?? 'blue', '#3b82f6')} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0]
              return (
                <div className="rounded-lg border border-border bg-popover/95 backdrop-blur p-2.5 text-xs shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: p.payload.fill }} />
                    <span className="text-foreground">{p.payload[index]}</span>
                    <span className="ml-3 font-mono text-foreground">{formatter(Number(p.value))}</span>
                  </div>
                </div>
              )
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-foreground">{value}</span>}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}
