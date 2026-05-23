// Helpers for transforming Supabase time-series rows into Tremor chart shape.

/**
 * Pivot rows so each timestamp is one chart-data point with all series as columns.
 * Example input: [{ts: 't1', node: 'A', value: 10}, {ts: 't1', node: 'B', value: 20}, ...]
 * Example output: [{date: 't1', A: 10, B: 20}, ...]
 */
export function pivotByCategory(
  rows: readonly unknown[],
  categoryCol: string,
  valueCol: string,
  formatDate: (iso: string) => string = (s) => s,
): Array<Record<string, string | number>> {
  const buckets = new Map<string, Record<string, string | number>>()
  for (const row of rows) {
    const r = row as Record<string, unknown>
    const ts = String(r.ts ?? '')
    const cat = String(r[categoryCol] ?? '—')
    const val = Number(r[valueCol] ?? 0)
    if (!buckets.has(ts)) buckets.set(ts, { date: formatDate(ts) })
    buckets.get(ts)![cat] = val
  }
  return Array.from(buckets.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

/**
 * Get unique category values in stable order (for use as Tremor `categories` prop).
 */
export function uniqueCategories(rows: readonly unknown[], categoryCol: string): string[] {
  return Array.from(new Set(rows.map((row) => String((row as Record<string, unknown>)[categoryCol] ?? '—')))).sort()
}

/**
 * Format an ISO timestamp into "HH:mm" or "MMM dd HH:mm" depending on span.
 */
export function chartTimeLabel(iso: string, includeDate = false): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (!includeDate) return `${hh}:${mm}`
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()} ${hh}:${mm}`
}

/**
 * Reduce a dense time-series to N evenly-spaced buckets (e.g., 100 points instead of 10k).
 * Each bucket averages the values within its time range. Useful for smoothing dense data.
 */
export function downsample<T extends { ts: string }>(rows: T[], targetCount: number): T[] {
  if (rows.length <= targetCount) return rows
  const step = Math.ceil(rows.length / targetCount)
  return rows.filter((_, i) => i % step === 0)
}
