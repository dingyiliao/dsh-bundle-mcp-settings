import { expect, it, vi } from 'vitest'
import { McpSettingsController } from '../src/client/controller.ts'
import type { ClientContext, SettingsDescribeFace, SettingsMirrorSnapshot } from '../src/client/types.ts'

it('projects redacted MCP settings and folds successful mutations', async () => {
  let snapshot: SettingsMirrorSnapshot = {
    status: 'ready',
    view: {
      writable: true,
      namespaces: [{
        ns: 'mcp',
        revision: 4,
        secrets: [{ path: ['servers', 'github', 'env', 'TOKEN'], set: true }],
        value: { servers: {} },
      }],
    },
  }
  const listeners = new Set<() => void>()
  const acceptView = vi.fn((view) => {
    snapshot = { ...snapshot, view: { writable: true, namespaces: [view] } }
    for (const listener of listeners) listener()
  })
  const mirror: SettingsDescribeFace = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    ensure: () => Promise.resolve(),
    acceptView,
  }
  const mutate = vi.fn(async () => ({
    ok: true as const,
    value: { ns: 'mcp', revision: 5, secrets: [], value: { servers: {} } },
  }))
  const ctx = { remote: { settings: { mutate } } } as unknown as ClientContext
  const controller = new McpSettingsController(ctx, mirror)

  expect(controller.getSnapshot()).toMatchObject({ status: 'ready', revision: 4, writable: true })
  await expect(controller.mutate([{ op: 'unset', path: ['servers', 'github'] }], 4)).resolves.toBeUndefined()
  expect(mutate).toHaveBeenCalledWith('mcp', [{ op: 'unset', path: ['servers', 'github'] }], 4)
  expect(controller.getSnapshot()).toMatchObject({ revision: 5 })

  controller.dispose()
})
