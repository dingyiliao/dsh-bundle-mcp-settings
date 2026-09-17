import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** Settings tab for user-managed stdio and Streamable HTTP MCP servers. */
import { useEffect, useMemo, useState } from 'react';
import { Button, IconPlusOutline16, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
function secretKeys(secrets, server, field) {
    return new Set(secrets.flatMap((secret) => {
        const [servers, name, section, key] = secret.path;
        return secret.set && servers === 'servers' && name === server && section === field && key !== undefined ? [key] : [];
    }));
}
function secretDraft(keys) {
    return [...keys].sort().map(key => `${key}=`).join('\n');
}
function parsePairs(text) {
    const entries = new Map();
    let invalid = false;
    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (line === '')
            continue;
        const split = line.indexOf('=');
        if (split <= 0) {
            invalid = true;
            continue;
        }
        const key = line.slice(0, split).trim();
        if (key === '' || entries.has(key)) {
            invalid = true;
            continue;
        }
        entries.set(key, line.slice(split + 1));
    }
    return { entries, invalid };
}
function draftFor(name, server, secrets) {
    return {
        originalName: name,
        name,
        enabled: server.enabled,
        transport: server.transport,
        command: server.command,
        args: server.args.join('\n'),
        cwd: server.cwd,
        url: server.url,
        env: secretDraft(secretKeys(secrets, name, 'env')),
        headers: secretDraft(secretKeys(secrets, name, 'headers')),
    };
}
function emptyDraft() {
    return {
        originalName: undefined,
        name: '',
        enabled: true,
        transport: 'stdio',
        command: '',
        args: '',
        cwd: '',
        url: '',
        env: '',
        headers: '',
    };
}
function appendSecretOps(ops, serverName, field, parsed, existing) {
    for (const key of existing) {
        if (!parsed.has(key))
            ops.push({ op: 'unset', path: ['servers', serverName, field, key] });
    }
    for (const [key, value] of parsed) {
        if (value === '' && existing.has(key))
            continue;
        ops.push({ op: 'set', path: ['servers', serverName, field, key], value });
    }
}
/** Render the server list, staged editor, and delete confirmation. */
export function McpServersTab(props) {
    const { t } = props;
    const state = props.useMcpServers(snapshot => snapshot);
    const [draft, setDraft] = useState();
    const [saving, setSaving] = useState(false);
    const [failure, setFailure] = useState();
    const [deleting, setDeleting] = useState();
    const [deletingBusy, setDeletingBusy] = useState(false);
    const servers = state.value?.servers ?? {};
    const names = Object.keys(servers).sort((left, right) => left.localeCompare(right));
    const env = useMemo(() => draft === undefined ? undefined : parsePairs(draft.env), [draft]);
    const headers = useMemo(() => draft === undefined ? undefined : parsePairs(draft.headers), [draft]);
    const existingEnv = draft?.originalName === undefined
        ? new Set()
        : secretKeys(state.secrets, draft.originalName, 'env');
    const existingHeaders = draft?.originalName === undefined
        ? new Set()
        : secretKeys(state.secrets, draft.originalName, 'headers');
    const missingNewSecret = (parsed, existing) => parsed !== undefined && [...parsed.entries].some(([key, value]) => value === '' && !existing.has(key));
    const duplicateName = draft !== undefined && draft.originalName === undefined && Object.hasOwn(servers, draft.name.trim());
    const invalid = draft === undefined
        || !SERVER_NAME_PATTERN.test(draft.name.trim())
        || duplicateName
        || (draft.enabled && draft.transport === 'stdio' && draft.command.trim() === '')
        || (draft.enabled && draft.transport === 'streamable-http' && draft.url.trim() === '')
        || env?.invalid === true
        || headers?.invalid === true
        || missingNewSecret(env, existingEnv)
        || missingNewSecret(headers, existingHeaders);
    useEffect(() => {
        if (draft?.originalName !== undefined && !Object.hasOwn(servers, draft.originalName))
            setDraft(undefined);
    }, [draft?.originalName, servers]);
    if (state.status === 'loading')
        return null;
    if (state.status !== 'ready')
        return _jsx("p", { className: "dsh-mcp-notice", children: t('unavailable') });
    const updateDraft = (patch) => {
        setFailure(undefined);
        setDraft(current => current === undefined ? current : { ...current, ...patch });
    };
    const save = () => {
        if (draft === undefined || invalid || state.revision === undefined || env === undefined || headers === undefined)
            return;
        const name = draft.name.trim();
        const args = draft.args.split('\n').map(value => value.trim()).filter(value => value !== '');
        const ops = [];
        if (draft.originalName === undefined) {
            ops.push({
                op: 'set',
                path: ['servers', name],
                value: {
                    enabled: draft.enabled,
                    transport: draft.transport,
                    command: draft.command.trim(),
                    args,
                    cwd: draft.cwd.trim(),
                    url: draft.url.trim(),
                    env: Object.fromEntries(env.entries),
                    headers: Object.fromEntries(headers.entries),
                },
            });
        }
        else {
            const root = ['servers', name];
            ops.push({ op: 'set', path: [...root, 'enabled'], value: draft.enabled }, { op: 'set', path: [...root, 'transport'], value: draft.transport }, { op: 'set', path: [...root, 'command'], value: draft.command.trim() }, { op: 'set', path: [...root, 'args'], value: args }, { op: 'set', path: [...root, 'cwd'], value: draft.cwd.trim() }, { op: 'set', path: [...root, 'url'], value: draft.url.trim() });
            appendSecretOps(ops, name, 'env', env.entries, existingEnv);
            appendSecretOps(ops, name, 'headers', headers.entries, existingHeaders);
        }
        setSaving(true);
        setFailure(undefined);
        void props.mutate(ops, state.revision).then((message) => {
            if (message === undefined)
                setDraft(undefined);
            else
                setFailure(message);
        }).finally(() => { setSaving(false); });
    };
    const remove = () => {
        if (deleting === undefined || state.revision === undefined)
            return;
        setDeletingBusy(true);
        setFailure(undefined);
        void props.mutate([{ op: 'unset', path: ['servers', deleting] }], state.revision).then((message) => {
            if (message === undefined)
                setDeleting(undefined);
            else
                setFailure(message);
        }).finally(() => { setDeletingBusy(false); });
    };
    return (_jsxs("div", { className: "dsh-mcp-section", children: [_jsxs("div", { className: "dsh-mcp-heading", children: [_jsxs("div", { children: [_jsx("h3", { className: "dsh-mcp-title", children: t('title') }), _jsx("p", { className: "dsh-mcp-intro", children: t('description') })] }), _jsx(Button, { variant: "outline", size: "sm", icon: _jsx(IconPlusOutline16, { size: 14 }), disabled: !state.writable || draft !== undefined, onClick: () => { setFailure(undefined); setDraft(emptyDraft()); }, children: t('add') })] }), !state.writable ? _jsx("p", { className: "dsh-mcp-notice", children: t('readOnly') }) : null, names.length === 0 && draft === undefined ? _jsx("p", { className: "dsh-mcp-empty", children: t('empty') }) : null, _jsx("ul", { className: "dsh-mcp-list", children: names.map((name) => {
                    const server = servers[name];
                    return (_jsxs("li", { className: "dsh-mcp-card", children: [_jsxs("div", { className: "dsh-mcp-card-head", children: [_jsxs("div", { className: "dsh-mcp-identity", children: [_jsx("span", { className: "dsh-mcp-name", children: name }), _jsx("span", { className: "dsh-mcp-transport", children: server.transport === 'stdio' ? 'stdio' : 'HTTP' }), !server.enabled ? _jsx("span", { className: "dsh-mcp-disabled", children: t('disabled') }) : null] }), _jsxs("div", { className: "dsh-mcp-actions", children: [_jsx(Button, { variant: "ghost", size: "sm", disabled: !state.writable || draft !== undefined, onClick: () => { setFailure(undefined); setDraft(draftFor(name, server, state.secrets)); }, children: t('edit') }), _jsx(Button, { variant: "ghost", size: "sm", className: "dsh-mcp-danger", disabled: !state.writable || draft !== undefined, onClick: () => { setFailure(undefined); setDeleting(name); }, children: t('delete') })] })] }), _jsx("p", { className: "dsh-mcp-endpoint", children: server.transport === 'stdio' ? [server.command, ...server.args].join(' ') : server.url }), draft?.originalName === name
                                ? renderEditor(draft, updateDraft, save, () => { setDraft(undefined); }, invalid, saving, failure, t)
                                : null] }, name));
                }) }), draft !== undefined && draft.originalName === undefined ? (_jsx("div", { className: "dsh-mcp-add-editor", children: renderEditor(draft, updateDraft, save, () => { setDraft(undefined); }, invalid, saving, failure, t) })) : null, _jsx(Modal, { open: deleting !== undefined, onClose: () => { if (!deletingBusy)
                    setDeleting(undefined); }, title: t('deleteTitle').replace('{name}', deleting ?? ''), closeLabel: t('close'), description: t('deleteDescription'), footer: (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", disabled: deletingBusy, onClick: () => { setDeleting(undefined); }, children: t('cancel') }), _jsx(Button, { variant: "outline", className: "dsh-mcp-danger", disabled: deletingBusy, onClick: remove, children: deletingBusy ? t('deleting') : t('delete') })] })), children: failure === undefined ? null : _jsx("p", { className: "dsh-mcp-error", children: failure }) })] }));
}
function renderEditor(draft, update, save, cancel, invalid, saving, failure, t) {
    const prefix = draft.originalName === undefined ? 'mcp-add' : `mcp-${draft.originalName}`;
    return (_jsxs("div", { className: "dsh-mcp-editor", children: [_jsxs("label", { className: "dsh-mcp-field", children: [_jsx("span", { children: t('name') }), _jsx("input", { "aria-label": t('name'), value: draft.name, disabled: draft.originalName !== undefined || saving, placeholder: t('namePlaceholder'), onChange: (event) => { update({ name: event.target.value }); } })] }), _jsxs("label", { className: "dsh-mcp-check", children: [_jsx("input", { type: "checkbox", checked: draft.enabled, disabled: saving, onChange: (event) => { update({ enabled: event.target.checked }); } }), _jsx("span", { children: t('enabled') })] }), _jsxs("label", { className: "dsh-mcp-field", htmlFor: `${prefix}-transport`, children: [_jsx("span", { children: t('transport') }), _jsxs("select", { id: `${prefix}-transport`, value: draft.transport, disabled: saving, onChange: (event) => { update({ transport: event.target.value }); }, children: [_jsx("option", { value: "stdio", children: t('stdio') }), _jsx("option", { value: "streamable-http", children: t('http') })] })] }), draft.transport === 'stdio' ? (_jsxs(_Fragment, { children: [_jsxs("label", { className: "dsh-mcp-field", children: [_jsx("span", { children: t('command') }), _jsx("input", { "aria-label": t('command'), value: draft.command, disabled: saving, placeholder: "npx", onChange: (event) => { update({ command: event.target.value }); } })] }), _jsxs("label", { className: "dsh-mcp-field", children: [_jsx("span", { children: t('args') }), _jsx("textarea", { "aria-label": t('args'), value: draft.args, disabled: saving, placeholder: t('argsPlaceholder'), onChange: (event) => { update({ args: event.target.value }); } })] }), _jsxs("label", { className: "dsh-mcp-field", children: [_jsx("span", { children: t('cwd') }), _jsx("input", { "aria-label": t('cwd'), value: draft.cwd, disabled: saving, placeholder: t('optional'), onChange: (event) => { update({ cwd: event.target.value }); } })] }), _jsxs("label", { className: "dsh-mcp-field", children: [_jsx("span", { children: t('env') }), _jsx("textarea", { "aria-label": t('env'), value: draft.env, disabled: saving, placeholder: t('pairsPlaceholder'), onChange: (event) => { update({ env: event.target.value }); } }), _jsx("small", { children: t('secretHint') })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("label", { className: "dsh-mcp-field", children: [_jsx("span", { children: t('url') }), _jsx("input", { "aria-label": t('url'), value: draft.url, disabled: saving, placeholder: "https://example.com/mcp", onChange: (event) => { update({ url: event.target.value }); } })] }), _jsxs("label", { className: "dsh-mcp-field", children: [_jsx("span", { children: t('headers') }), _jsx("textarea", { "aria-label": t('headers'), value: draft.headers, disabled: saving, placeholder: t('pairsPlaceholder'), onChange: (event) => { update({ headers: event.target.value }); } }), _jsx("small", { children: t('secretHint') })] })] })), invalid ? _jsx("p", { className: "dsh-mcp-error", children: t('invalid') }) : null, failure === undefined ? null : _jsx("p", { className: "dsh-mcp-error", children: failure }), _jsxs("div", { className: "dsh-mcp-editor-actions", children: [_jsx(Button, { variant: "outline", disabled: saving, onClick: cancel, children: t('cancel') }), _jsx(Button, { variant: "primary", disabled: invalid || saving, onClick: save, children: saving ? t('saving') : t('save') })] })] }));
}
//# sourceMappingURL=McpServersTab.js.map