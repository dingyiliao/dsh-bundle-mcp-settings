/** Lifecycle reconciliation for settings-owned MCP client instances. */
/** One existing MCP client's resolved configuration. */
export interface McpClientConfig {
    serverName: string;
    toolCallTimeoutMs: number;
    failOnStartupError: boolean;
    maxInstructionBytes: number;
    reconnect: {
        enabled: boolean;
        initialDelayMs: number;
        maxDelayMs: number;
        maxAttempts: number;
    };
    transport: 'stdio' | 'streamable-http';
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
    url?: string;
    headers?: Record<string, string>;
}
/** Settings resolved by the Host plugin. */
export interface McpSettingsConfig {
    servers: Record<string, {
        enabled: boolean;
        transport: 'stdio' | 'streamable-http';
        command: string;
        args: string[];
        env: Record<string, string>;
        cwd: string;
        url: string;
        headers: Record<string, string>;
        toolCallTimeoutMs: number;
        failOnStartupError: boolean;
        maxInstructionBytes: number;
        reconnect: {
            enabled: boolean;
            initialDelayMs: number;
            maxDelayMs: number;
            maxAttempts: number;
        };
    }>;
}
/** Small Fiber face needed by the reconciler. */
export interface ManagedMcpFiber {
    await(): Promise<unknown>;
    dispose(): Promise<void>;
}
/** Host callback mounting one existing MCP client plugin. */
export type MountMcpServer = (config: McpClientConfig) => ManagedMcpFiber;
/** Convert enabled settings records into the existing one-server client config. */
export declare function resolveMcpServers(config: McpSettingsConfig): Map<string, McpClientConfig>;
/** Serialized, quiescent replacement of dynamically mounted MCP clients. */
export declare class McpSettingsRuntime {
    private readonly mount;
    private readonly report;
    private readonly mounted;
    private tail;
    private stopped;
    constructor(mount: MountMcpServer, report: (serverName: string, error: unknown) => void);
    /** Queue one complete desired server set and return its settlement. */
    replace(config: McpSettingsConfig): Promise<void>;
    /** Stop queued replacement work and dispose every mounted client. */
    dispose(): Promise<void>;
}
