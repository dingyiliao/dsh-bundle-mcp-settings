/** Browser plugin contributing one MCP page to the existing Plugins settings section. */
import type { ClientContext } from './types.ts';
export type { McpServersTabProps } from './McpServersTab.tsx';
export type { McpServerSettingsView, McpSettingsSnapshot, McpSettingsView } from './types.ts';
/** Required browser services. */
export declare const inject: string[];
/** Register localization, styles, and the feature-owned MCP tab. */
export declare function apply(ctx: ClientContext): void;
