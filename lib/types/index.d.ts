/** Settings-backed lifecycle manager for user-configured MCP clients. */
import type { Context } from '@deepseek-ai/cordis';
import { type McpSettingsConfig } from './runtime.ts';
/** Settings namespace shared with the browser configuration surface. */
export declare const MCP_SETTINGS_NAMESPACE = "mcp";
export type Config = McpSettingsConfig;
/** Serialized configuration schema. */
export declare const Config: import("@deepseek-ai/schemastery").Chain;
/** Reject cross-field settings before the document is persisted. */
export declare function assertServiceableMcpSettings(config: Config): void;
/** Required Host services. */
export declare const inject: string[];
/** Register the settings section and reconcile enabled servers live. */
export declare function apply(ctx: Context, config: Config): Promise<void>;
