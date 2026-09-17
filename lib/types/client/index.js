/** Browser plugin contributing one MCP page to the existing Plugins settings section. */
import { McpServersTab } from "./McpServersTab.js";
import { McpSettingsController } from "./controller.js";
import { en, zh } from "./locales.js";
import { installStyles } from "./styles.js";
const NS = 'settings.mcp';
/** Required browser services. */
export const inject = ['slots', 'locale', 'remote', 'remote.settings', 'settingsScope'];
/** Register localization, styles, and the feature-owned MCP tab. */
export function apply(ctx) {
    const t = ctx.locale.bind(NS);
    const controller = new McpSettingsController(ctx, ctx.settingsScope.describe());
    ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'mcp-settings: dictionaries');
    ctx.effect(() => () => { controller.dispose(); }, 'mcp-settings: browser controller');
    installStyles(ctx);
    const injected = () => ({
        hooks: { mcpServers: controller },
        mutate: (ops, revision) => controller.mutate(ops, revision),
    });
    ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
        name: 'settings.plugins.tab',
        id: 'mcp',
        order: 5,
        label: () => t('tab'),
        locale: NS,
        inject: injected,
    }, McpServersTab));
}
//# sourceMappingURL=index.js.map