export const MCP_SETTINGS_NAMESPACE = 'mcp';
function isMcpSettingsView(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        && typeof Reflect.get(value, 'servers') === 'object' && Reflect.get(value, 'servers') !== null
        && !Array.isArray(Reflect.get(value, 'servers'));
}
/** Observable projection of the shared settings mirror onto the MCP namespace. */
export class McpSettingsController {
    ctx;
    mirror;
    listeners = new Set();
    snapshot = {
        status: 'loading',
        value: undefined,
        revision: undefined,
        writable: false,
        secrets: [],
    };
    unsubscribe;
    constructor(ctx, mirror) {
        this.ctx = ctx;
        this.mirror = mirror;
        this.unsubscribe = mirror.subscribe(() => { this.derive(); });
        this.derive();
        void mirror.ensure().then(() => { this.derive(); });
    }
    getSnapshot = () => this.snapshot;
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };
    /** Persist one revision-fenced set of MCP server edits. */
    async mutate(ops, revision) {
        const response = await this.ctx.remote.settings.mutate(MCP_SETTINGS_NAMESPACE, [...ops], revision);
        if (!response.ok)
            return response.error.message;
        this.mirror.acceptView(response.value);
        return undefined;
    }
    dispose() {
        this.unsubscribe();
        this.listeners.clear();
    }
    derive() {
        const source = this.mirror.getSnapshot();
        const view = source.view?.namespaces.find(candidate => candidate.ns === MCP_SETTINGS_NAMESPACE);
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
            };
        for (const listener of this.listeners)
            listener();
    }
}
//# sourceMappingURL=controller.js.map