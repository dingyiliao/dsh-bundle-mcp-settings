/** Browser plugin contributing one MCP page to the existing Plugins settings section. */

import { McpServersTab } from './McpServersTab.tsx'
import { McpSettingsController } from './controller.ts'
import { en, zh } from './locales.ts'
import { installStyles } from './styles.ts'
import type { ClientContext, McpServersTabFace } from './types.ts'

export type { McpServersTabProps } from './McpServersTab.tsx'
export type { McpServerSettingsView, McpSettingsSnapshot, McpSettingsView } from './types.ts'

const NS = 'settings.mcp'

/** Required browser services. */
export const inject = ['slots', 'locale', 'remote', 'remote.settings', 'settingsScope']

/** Register localization, styles, and the feature-owned MCP tab. */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  const controller = new McpSettingsController(ctx, ctx.settingsScope.describe())
  ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'mcp-settings: dictionaries')
  ctx.effect(() => () => { controller.dispose() }, 'mcp-settings: browser controller')
  installStyles(ctx)

  const injected = (): McpServersTabFace => ({
    hooks: { mcpServers: controller },
    mutate: (ops, revision) => controller.mutate(ops, revision),
  })
  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'mcp',
    order: 5,
    label: () => t('tab'),
    locale: NS,
    inject: injected,
  }, McpServersTab))
}
