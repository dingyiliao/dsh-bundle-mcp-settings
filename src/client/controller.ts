import type {
  ClientContext, McpSettingsSnapshot, McpSettingsView, SettingsDescribeFace, SettingsPathOpView,
} from './types.ts'

export const MCP_SETTINGS_NAMESPACE = 'mcp'

function isMcpSettingsView(value: unknown): value is McpSettingsView {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && typeof Reflect.get(value, 'servers') === 'object' && Reflect.get(value, 'servers') !== null
    && !Array.isArray(Reflect.get(value, 'servers'))
}

/** Observable projection of the shared settings mirror onto the MCP namespace. */
export class McpSettingsController {
  private readonly listeners = new Set<() => void>()
  private snapshot: McpSettingsSnapshot = {
    status: 'loading',
    value: undefined,
    revision: undefined,
    writable: false,
    secrets: [],
  }
  private readonly unsubscribe: () => void

  constructor(
    private readonly ctx: ClientContext,
    private readonly mirror: SettingsDescribeFace,
  ) {
    this.unsubscribe = mirror.subscribe(() => { this.derive() })
    this.derive()
    void mirror.ensure().then(() => { this.derive() })
  }

  getSnapshot = (): McpSettingsSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Persist one revision-fenced set of MCP server edits. */
  async mutate(ops: readonly SettingsPathOpView[], revision: number): Promise<string | undefined> {
    const response = await this.ctx.remote.settings.mutate(MCP_SETTINGS_NAMESPACE, [...ops], revision)
    if (!response.ok) return response.error.message
    this.mirror.acceptView(response.value)
    return undefined
  }

  dispose(): void {
    this.unsubscribe()
    this.listeners.clear()
  }

  private derive(): void {
    const source = this.mirror.getSnapshot()
    const view = source.view?.namespaces.find(candidate => candidate.ns === MCP_SETTINGS_NAMESPACE)
    this.snapshot = view !== undefined && isMcpSettingsView(view.value)
      ? {
        status: 'ready',
        value: view.value,
        revision: view.revision,
        writable: source.view?.writable ?? false,
        secrets: view.secrets,
      }
      : {
        status: source.status === 'idle' || source.status === 'loading' ? 'loading' : 'unavailable',
        value: undefined,
        revision: undefined,
        writable: source.view?.writable ?? false,
        secrets: [],
      }
    for (const listener of this.listeners) listener()
  }
}
