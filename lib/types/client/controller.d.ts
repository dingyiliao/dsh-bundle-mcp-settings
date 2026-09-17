import type { ClientContext, McpSettingsSnapshot, SettingsDescribeFace, SettingsPathOpView } from './types.ts';
export declare const MCP_SETTINGS_NAMESPACE = "mcp";
/** Observable projection of the shared settings mirror onto the MCP namespace. */
export declare class McpSettingsController {
    private readonly ctx;
    private readonly mirror;
    private readonly listeners;
    private snapshot;
    private readonly unsubscribe;
    constructor(ctx: ClientContext, mirror: SettingsDescribeFace);
    getSnapshot: () => McpSettingsSnapshot;
    subscribe: (listener: () => void) => (() => void);
    /** Persist one revision-fenced set of MCP server edits. */
    mutate(ops: readonly SettingsPathOpView[], revision: number): Promise<string | undefined>;
    dispose(): void;
    private derive;
}
