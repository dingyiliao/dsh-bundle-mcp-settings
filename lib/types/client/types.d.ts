/** Browser-side settings and remote faces used by the MCP tab. */
export type JsonValue = null | boolean | number | string | JsonValue[] | {
    [key: string]: JsonValue;
};
export interface SettingsSecretView {
    path: string[];
    set: boolean;
}
export type SettingsPathOpView = {
    op: 'set';
    path: string[];
    value: JsonValue;
} | {
    op: 'unset';
    path: string[];
};
export interface McpServerSettingsView {
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
}
export interface McpSettingsView {
    servers: Record<string, McpServerSettingsView>;
}
export interface McpSettingsSnapshot {
    status: 'loading' | 'ready' | 'unavailable';
    value: McpSettingsView | undefined;
    revision: number | undefined;
    writable: boolean;
    secrets: readonly SettingsSecretView[];
}
export interface SettingsNamespaceView {
    ns: string;
    value: JsonValue;
    secrets: SettingsSecretView[];
    revision: number;
}
export interface SettingsMirrorSnapshot {
    status: 'idle' | 'loading' | 'ready' | 'unavailable';
    view: {
        namespaces: readonly SettingsNamespaceView[];
        writable: boolean;
    } | undefined;
}
export interface SettingsDescribeFace {
    getSnapshot(): SettingsMirrorSnapshot;
    subscribe(listener: () => void): () => void;
    ensure(): Promise<void>;
    acceptView(view: SettingsNamespaceView): void;
}
export type RemoteMutationResult = {
    ok: true;
    value: SettingsNamespaceView;
} | {
    ok: false;
    error: {
        message: string;
    };
};
export interface McpServersTabFace {
    hooks: {
        mcpServers: {
            getSnapshot(): McpSettingsSnapshot;
            subscribe(listener: () => void): () => void;
        };
    };
    mutate(ops: readonly SettingsPathOpView[], revision: number): Promise<string | undefined>;
}
export interface ClientContext {
    locale: {
        register(namespace: string, dictionaries: {
            en: Record<string, string>;
            zh: Record<string, string>;
        }): () => void;
        bind(namespace: string): (key: LocaleKey) => string;
    };
    slots: {
        inject(name: string, callback: () => () => void): void;
        register(options: Record<string, unknown>, component: unknown): () => void;
    };
    settingsScope: {
        describe(): SettingsDescribeFace;
    };
    remote: {
        settings: {
            mutate(namespace: string, ops: SettingsPathOpView[], revision: number): Promise<RemoteMutationResult>;
        };
    };
    effect(callback: () => (() => void | Promise<void>), label?: string): void;
}
export type LocaleKey = 'tab' | 'title' | 'description' | 'add' | 'empty' | 'unavailable' | 'readOnly' | 'disabled' | 'edit' | 'delete' | 'deleteTitle' | 'deleteDescription' | 'deleting' | 'close' | 'cancel' | 'name' | 'namePlaceholder' | 'enabled' | 'transport' | 'stdio' | 'http' | 'command' | 'args' | 'argsPlaceholder' | 'cwd' | 'optional' | 'env' | 'url' | 'headers' | 'pairsPlaceholder' | 'secretHint' | 'invalid' | 'save' | 'saving';
