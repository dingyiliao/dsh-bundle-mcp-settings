/** Lifecycle reconciliation for settings-owned MCP client instances. */
function equalJson(left, right) {
    if (Object.is(left, right))
        return true;
    if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null)
        return false;
    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length)
            return false;
        return left.every((value, index) => equalJson(value, right[index]));
    }
    const leftRecord = left;
    const rightRecord = right;
    const keys = Object.keys(leftRecord);
    return keys.length === Object.keys(rightRecord).length
        && keys.every(key => Object.hasOwn(rightRecord, key) && equalJson(leftRecord[key], rightRecord[key]));
}
/** Convert enabled settings records into the existing one-server client config. */
export function resolveMcpServers(config) {
    const resolved = new Map();
    for (const [serverName, server] of Object.entries(config.servers)) {
        if (!server.enabled)
            continue;
        const common = {
            serverName,
            toolCallTimeoutMs: server.toolCallTimeoutMs,
            failOnStartupError: server.failOnStartupError,
            maxInstructionBytes: server.maxInstructionBytes,
            reconnect: server.reconnect,
        };
        resolved.set(serverName, server.transport === 'stdio'
            ? {
                ...common,
                transport: 'stdio',
                command: server.command,
                args: server.args,
                env: server.env,
                cwd: server.cwd,
            }
            : {
                ...common,
                transport: 'streamable-http',
                url: server.url,
                headers: server.headers,
            });
    }
    return resolved;
}
/** Serialized, quiescent replacement of dynamically mounted MCP clients. */
export class McpSettingsRuntime {
    mount;
    report;
    mounted = new Map();
    tail = Promise.resolve();
    stopped = false;
    constructor(mount, report) {
        this.mount = mount;
        this.report = report;
    }
    /** Queue one complete desired server set and return its settlement. */
    replace(config) {
        if (this.stopped)
            return this.tail;
        const desired = resolveMcpServers(config);
        const task = this.tail.then(async () => {
            if (this.stopped)
                return;
            const removed = [];
            for (const [serverName, current] of this.mounted) {
                const next = desired.get(serverName);
                if (next !== undefined && equalJson(current.config, next))
                    continue;
                this.mounted.delete(serverName);
                removed.push(current.fiber.dispose());
            }
            await Promise.all(removed);
            if (this.stopped)
                return;
            const activations = [];
            for (const [serverName, next] of desired) {
                if (this.mounted.has(serverName))
                    continue;
                const fiber = this.mount(next);
                this.mounted.set(serverName, { config: next, fiber });
                activations.push(fiber.await()
                    .then(() => undefined)
                    .catch((error) => { this.report(serverName, error); }));
            }
            await Promise.all(activations);
        });
        this.tail = task.catch(() => { });
        return task;
    }
    /** Stop queued replacement work and dispose every mounted client. */
    async dispose() {
        if (this.stopped)
            return this.tail;
        this.stopped = true;
        await this.tail;
        const fibers = [...this.mounted.values()].map(entry => entry.fiber);
        this.mounted.clear();
        await Promise.all(fibers.map(fiber => fiber.dispose()));
    }
}
//# sourceMappingURL=runtime.js.map