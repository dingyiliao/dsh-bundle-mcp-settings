/** Settings-backed lifecycle manager for user-configured MCP clients. */

import z from '@deepseek-ai/schemastery'
import * as McpClient from '@deepseek-ai/dsh-mcp-client'
import type { Context } from '@deepseek-ai/cordis'
import { McpSettingsRuntime, type McpSettingsConfig } from './runtime.ts'

/** Settings namespace shared with the browser configuration surface. */
export const MCP_SETTINGS_NAMESPACE = 'mcp'

const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/
const DEFAULT_TOOL_CALL_TIMEOUT_MS = 60_000
const DEFAULT_MAX_INSTRUCTION_BYTES = 32_768

export type Config = McpSettingsConfig

const Reconnect = z.object({
  enabled: z.boolean().default(true),
  initialDelayMs: z.number().min(1).default(500),
  maxDelayMs: z.number().min(1).default(30_000),
  maxAttempts: z.number().step(1).min(1).default(10),
})

const Server = z.object({
  enabled: z.boolean().default(true),
  transport: z.union([z.const('stdio'), z.const('streamable-http')]).default('stdio'),
  command: z.string().default(''),
  args: z.array(String).default([]),
  env: z.dict(z.string().role('secret')).default({}),
  cwd: z.string().default(''),
  url: z.string().default(''),
  headers: z.dict(z.string().role('secret')).default({}),
  toolCallTimeoutMs: z.number().min(1).default(DEFAULT_TOOL_CALL_TIMEOUT_MS),
  failOnStartupError: z.boolean().default(false),
  maxInstructionBytes: z.number().step(1).min(1).default(DEFAULT_MAX_INSTRUCTION_BYTES),
  reconnect: Reconnect,
})

/** Serialized configuration schema. */
export const Config = z.object({
  servers: z.dict(Server).default({}),
})

/** Reject cross-field settings before the document is persisted. */
export function assertServiceableMcpSettings(config: Config): void {
  for (const [serverName, server] of Object.entries(config.servers)) {
    if (!SERVER_NAME_PATTERN.test(serverName)) {
      throw new Error(`mcp: server name "${serverName}" must match ${String(SERVER_NAME_PATTERN)}`)
    }
    if (server.reconnect.maxDelayMs < server.reconnect.initialDelayMs) {
      throw new Error(`mcp: server "${serverName}" reconnect.maxDelayMs must be at least reconnect.initialDelayMs`)
    }
    if (!server.enabled) continue
    if (server.transport === 'stdio') {
      if (server.command.trim() === '') throw new Error(`mcp: stdio server "${serverName}" requires command`)
      continue
    }
    let endpoint: URL
    try {
      endpoint = new URL(server.url)
    } catch {
      throw new Error(`mcp: HTTP server "${serverName}" requires a valid URL`)
    }
    if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
      throw new Error(`mcp: HTTP server "${serverName}" URL must use http or https`)
    }
  }
}

/** Required Host services. */
export const inject = ['tools', 'settings']

/** Register the settings section and reconcile enabled servers live. */
export async function apply(ctx: Context, config: Config): Promise<void> {
  let current: () => Config = () => config
  const runtime = new McpSettingsRuntime(
    server => ctx.plugin(McpClient, server),
    (serverName, error) => {
      ctx.logger.error(`mcp-settings: server "${serverName}" failed to activate`)
      ctx.logger.error(error)
    },
  )
  ctx.effect(() => async () => { await runtime.dispose() }, 'mcp-settings: managed clients')
  ctx.settings.installSection(ctx, MCP_SETTINGS_NAMESPACE, Config, config, {
    validate: assertServiceableMcpSettings,
    setSource: (source) => { current = source },
    onChange: () => { void runtime.replace(current()) },
  })
  await runtime.replace(current())
}
