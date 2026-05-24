// Whitelist of operations the web admin can spawn on the npm box.
//
// Security model: the UI sends a `kind` (enum) + structured `args`.
// The server validates with the zod schema, maps to the exact script
// path, and spawns via execve (no shell). Pattern-matched args mean
// callers cannot inject shell metacharacters or path traversal.
//
// To add a new op:
//   1) add to OperationKind union
//   2) add the corresponding REGISTRY entry
//   3) optionally add a UI affordance — the server enforces everything

import { z } from 'zod'

export type OperationKind =
  | 'customer_cn_add'
  | 'customer_cn_remove'
  | 'customer_cn_regenerate'
  | 'customer_wg_add'
  | 'customer_wg_remove'
  | 'customer_wg_regenerate'
  | 'customer_dual_add'
  | 'customer_dual_remove'
  | 'customer_dual_regenerate'
  | 'device_add'
  | 'device_enable'
  | 'device_disable'
  | 'device_revoke'

// Customer slug — same constraints the underlying scripts enforce.
const slug = z.string().min(2).max(40).regex(/^[a-z0-9_-]+$/, {
  message: 'lowercase alphanumeric, dash, underscore only',
})

// Device names allow mixed case (existing scripts accept it).
const deviceName = z.string().min(1).max(40).regex(/^[a-zA-Z0-9_-]+$/)

const customerArgs = z.object({ name: slug })
const deviceArgs = z.object({ customer: slug, device: deviceName })
const deviceAddArgs = z.object({
  customer: slug,
  device: deviceName.optional(), // add.sh auto-generates if omitted
})

export interface OpDef {
  script: string
  argsSchema: z.ZodSchema
  toArgv: (parsed: any) => string[]
  // Destructive ops force the UI into type-to-confirm and the runner
  // can pipe 'y\n' to stdin to bypass `read -p` prompts.
  destructive: boolean
  // Human-readable description for /operations/history rows.
  label: string
}

const SCRIPTS_ROOT = '/home/vwision/scripts'

export const REGISTRY: Record<OperationKind, OpDef> = {
  customer_cn_add: {
    script: `${SCRIPTS_ROOT}/customers/cn/add.sh`,
    argsSchema: customerArgs,
    toArgv: ({ name }) => [name],
    destructive: false,
    label: 'Add CN customer',
  },
  customer_cn_remove: {
    script: `${SCRIPTS_ROOT}/customers/cn/remove.sh`,
    argsSchema: customerArgs,
    toArgv: ({ name }) => [name],
    destructive: true,
    label: 'Remove CN customer',
  },
  customer_cn_regenerate: {
    script: `${SCRIPTS_ROOT}/customers/cn/regenerate.sh`,
    argsSchema: customerArgs,
    toArgv: ({ name }) => [name],
    destructive: false,
    label: 'Regenerate CN customer YAML',
  },
  customer_wg_add: {
    script: `${SCRIPTS_ROOT}/customers/wg/add.sh`,
    argsSchema: customerArgs,
    toArgv: ({ name }) => [name],
    destructive: false,
    label: 'Add WG customer',
  },
  customer_wg_remove: {
    script: `${SCRIPTS_ROOT}/customers/wg/remove.sh`,
    argsSchema: customerArgs,
    toArgv: ({ name }) => [name],
    destructive: true,
    label: 'Remove WG customer',
  },
  customer_wg_regenerate: {
    script: `${SCRIPTS_ROOT}/customers/wg/regenerate.sh`,
    argsSchema: customerArgs,
    toArgv: ({ name }) => [name],
    destructive: false,
    label: 'Regenerate WG customer YAML',
  },
  customer_dual_add: {
    script: `${SCRIPTS_ROOT}/customers/dual/add.sh`,
    argsSchema: customerArgs,
    toArgv: ({ name }) => [name],
    destructive: false,
    label: 'Add dual (geo-auto) customer',
  },
  customer_dual_remove: {
    script: `${SCRIPTS_ROOT}/customers/dual/remove.sh`,
    argsSchema: customerArgs,
    toArgv: ({ name }) => [name],
    destructive: true,
    label: 'Remove dual customer',
  },
  customer_dual_regenerate: {
    script: `${SCRIPTS_ROOT}/customers/dual/regenerate.sh`,
    argsSchema: customerArgs,
    toArgv: ({ name }) => [name],
    destructive: false,
    label: 'Regenerate dual customer YAMLs',
  },
  device_add: {
    script: `${SCRIPTS_ROOT}/devices/add.sh`,
    argsSchema: deviceAddArgs,
    toArgv: ({ customer, device }) => (device ? [customer, device] : [customer]),
    destructive: false,
    label: 'Stage pending device',
  },
  device_enable: {
    script: `${SCRIPTS_ROOT}/devices/enable.sh`,
    argsSchema: deviceArgs,
    toArgv: ({ customer, device }) => [customer, device],
    destructive: false,
    label: 'Enable device on all nodes',
  },
  device_disable: {
    script: `${SCRIPTS_ROOT}/devices/disable.sh`,
    argsSchema: deviceArgs,
    toArgv: ({ customer, device }) => [customer, device],
    destructive: true,
    label: 'Disable device on all nodes',
  },
  device_revoke: {
    script: `${SCRIPTS_ROOT}/devices/revoke.sh`,
    argsSchema: deviceArgs,
    toArgv: ({ customer, device }) => ['--yes', customer, device],
    destructive: true,
    label: 'Permanently revoke device',
  },
}

export function isOperationKind(s: string): s is OperationKind {
  return s in REGISTRY
}
