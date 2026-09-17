import { describe, expect, it, vi } from 'vitest'
import {
  McpSettingsRuntime, resolveMcpServers, type ManagedMcpFiber, type McpSettingsConfig,
} from '../src/runtime.ts'

function config(overrides: Partial<McpSettingsConfig['servers'][string]> = {}): McpSettingsConfig {
  return {
    servers: {
      local: {
        enabled: true,
        transport: 'stdio',
        command: 'node',
        args: ['server.js'],
        env: {},
        cwd: '',
        url: '',
        headers: {},
        toolCallTimeoutMs: 60_000,
        failOnStartupError: false,
        maxInstructionBytes: 32_768,
        reconnect: { enabled: true, initialDelayMs: 500, maxDelayMs: 30_000, maxAttempts: 10 },
        ...overrides,
      },
    },
  }
}

describe('MCP settings resolution', () => {
  it('projects only enabled records onto the existing client config', () => {
    expect([...resolveMcpServers(config()).values()]).toEqual([
      expect.objectContaining({ serverName: 'local', transport: 'stdio', command: 'node' }),
    ])
    expect(resolveMcpServers(config({ enabled: false }))).toEqual(new Map())
    expect([...resolveMcpServers(config({
      transport: 'streamable-http', url: 'https://example.test/mcp', headers: { Authorization: 'Bearer x' },
    })).values()]).toEqual([
      expect.objectContaining({
        serverName: 'local', transport: 'streamable-http', url: 'https://example.test/mcp',
        headers: { Authorization: 'Bearer x' },
      }),
    ])
  })
})

describe('McpSettingsRuntime', () => {
  it('keeps unchanged clients, replaces changed clients after disposal, and tears down', async () => {
    const fibers: Array<ManagedMcpFiber & { dispose: ReturnType<typeof vi.fn> }> = []
    const mount = vi.fn(() => {
      const fiber = { await: () => Promise.resolve(), dispose: vi.fn(() => Promise.resolve()) }
      fibers.push(fiber)
      return fiber
    })
    const runtime = new McpSettingsRuntime(mount, vi.fn())

    await runtime.replace(config())
    await runtime.replace(config())
    expect(mount).toHaveBeenCalledTimes(1)

    await runtime.replace(config({ args: ['other.js'] }))
    expect(fibers[0]?.dispose).toHaveBeenCalledOnce()
    expect(mount).toHaveBeenCalledTimes(2)

    await runtime.replace(config({ enabled: false }))
    expect(fibers[1]?.dispose).toHaveBeenCalledOnce()
    await runtime.dispose()
  })

  it('contains one activation failure and still mounts siblings', async () => {
    const report = vi.fn()
    const mount = vi.fn((server: { serverName: string }) => ({
      await: () => server.serverName === 'local' ? Promise.reject(new Error('offline')) : Promise.resolve(),
      dispose: () => Promise.resolve(),
    }))
    const runtime = new McpSettingsRuntime(mount, report)
    const next = config()
    next.servers.second = { ...next.servers.local!, command: 'other' }

    await runtime.replace(next)

    expect(mount).toHaveBeenCalledTimes(2)
    expect(report).toHaveBeenCalledWith('local', expect.any(Error))
    await runtime.dispose()
  })
})
