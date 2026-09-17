/** Lifecycle reconciliation for settings-owned MCP client instances. */

/** One existing MCP client's resolved configuration. */
export interface McpClientConfig {
  serverName: string
  toolCallTimeoutMs: number
  failOnStartupError: boolean
  maxInstructionBytes: number
  reconnect: {
    enabled: boolean
    initialDelayMs: number
    maxDelayMs: number
    maxAttempts: number
  }
  transport: 'stdio' | 'streamable-http'
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  url?: string
  headers?: Record<string, string>
}

/** Settings resolved by the Host plugin. */
export interface McpSettingsConfig {
  servers: Record<string, {
    enabled: boolean
    transport: 'stdio' | 'streamable-http'
    command: string
    args: string[]
    env: Record<string, string>
    cwd: string
    url: string
    headers: Record<string, string>
    toolCallTimeoutMs: number
    failOnStartupError: boolean
    maxInstructionBytes: number
    reconnect: {
      enabled: boolean
      initialDelayMs: number
      maxDelayMs: number
      maxAttempts: number
    }
  }>
}

/** Small Fiber face needed by the reconciler. */
export interface ManagedMcpFiber {
  await(): Promise<unknown>
  dispose(): Promise<void>
}

/** Host callback mounting one existing MCP client plugin. */
export type MountMcpServer = (config: McpClientConfig) => ManagedMcpFiber

interface MountedServer {
  readonly config: McpClientConfig
  readonly fiber: ManagedMcpFiber
}

function equalJson(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) return false
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
    return left.every((value, index) => equalJson(value, right[index]))
  }
  const leftRecord = left as Record<string, unknown>
  const rightRecord = right as Record<string, unknown>
  const keys = Object.keys(leftRecord)
  return keys.length === Object.keys(rightRecord).length
    && keys.every(key => Object.hasOwn(rightRecord, key) && equalJson(leftRecord[key], rightRecord[key]))
}

/** Convert enabled settings records into the existing one-server client config. */
export function resolveMcpServers(config: McpSettingsConfig): Map<string, McpClientConfig> {
  const resolved = new Map<string, McpClientConfig>()
  for (const [serverName, server] of Object.entries(config.servers)) {
    if (!server.enabled) continue
    const common = {
      serverName,
      toolCallTimeoutMs: server.toolCallTimeoutMs,
      failOnStartupError: server.failOnStartupError,
      maxInstructionBytes: server.maxInstructionBytes,
      reconnect: server.reconnect,
    }
    resolved.set(serverName, server.transport === 'stdio'
      ? {
        ...common,
        transport: 'stdio',
        command: server.command,
        args: server.args,
        env: server.env,
        cwd: server.cwd,
      }
      : {
        ...common,
        transport: 'streamable-http',
        url: server.url,
        headers: server.headers,
      })
  }
  return resolved
}

/** Serialized, quiescent replacement of dynamically mounted MCP clients. */
export class McpSettingsRuntime {
  private readonly mounted = new Map<string, MountedServer>()
  private tail: Promise<void> = Promise.resolve()
  private stopped = false

  constructor(
    private readonly mount: MountMcpServer,
    private readonly report: (serverName: string, error: unknown) => void,
  ) {}

  /** Queue one complete desired server set and return its settlement. */
  replace(config: McpSettingsConfig): Promise<void> {
    if (this.stopped) return this.tail
    const desired = resolveMcpServers(config)
    const task = this.tail.then(async () => {
      if (this.stopped) return
      const removed: Promise<void>[] = []
      for (const [serverName, current] of this.mounted) {
        const next = desired.get(serverName)
        if (next !== undefined && equalJson(current.config, next)) continue
        this.mounted.delete(serverName)
        removed.push(current.fiber.dispose())
      }
      await Promise.all(removed)
      if (this.stopped) return
      const activations: Promise<void>[] = []
      for (const [serverName, next] of desired) {
        if (this.mounted.has(serverName)) continue
        const fiber = this.mount(next)
        this.mounted.set(serverName, { config: next, fiber })
        activations.push(fiber.await()
          .then(() => undefined)
          .catch((error: unknown) => { this.report(serverName, error) }))
      }
      await Promise.all(activations)
    })
    this.tail = task.catch(() => {})
    return task
  }

  /** Stop queued replacement work and dispose every mounted client. */
  async dispose(): Promise<void> {
    if (this.stopped) return this.tail
    this.stopped = true
    await this.tail
    const fibers = [...this.mounted.values()].map(entry => entry.fiber)
    this.mounted.clear()
    await Promise.all(fibers.map(fiber => fiber.dispose()))
  }
}
