/** Settings tab for user-managed stdio and Streamable HTTP MCP servers. */
import type { LocaleKey, McpSettingsSnapshot, SettingsPathOpView } from './types.ts';
export interface McpServersTabProps {
    t(key: LocaleKey): string;
    useMcpServers<T>(selector: (snapshot: McpSettingsSnapshot) => T): T;
    mutate(ops: readonly SettingsPathOpView[], revision: number): Promise<string | undefined>;
}
/** Render the server list, staged editor, and delete confirmation. */
export declare function McpServersTab(props: McpServersTabProps): import("react").JSX.Element | null;
