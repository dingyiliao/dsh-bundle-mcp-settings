/** Settings tab for user-managed stdio and Streamable HTTP MCP servers. */

import { useEffect, useMemo, useState } from 'react'
import { Button, IconPlusOutline16, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  LocaleKey, McpServerSettingsView, McpSettingsSnapshot, SettingsPathOpView, SettingsSecretView,
} from './types.ts'

const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/

interface EditorDraft {
  readonly originalName: string | undefined
  name: string
  enabled: boolean
  transport: 'stdio' | 'streamable-http'
  command: string
  args: string
  cwd: string
  url: string
  env: string
  headers: string
}

interface PairParse {
  readonly entries: Map<string, string>
  readonly invalid: boolean
}

export interface McpServersTabProps {
  t(key: LocaleKey): string
  useMcpServers<T>(selector: (snapshot: McpSettingsSnapshot) => T): T
  mutate(ops: readonly SettingsPathOpView[], revision: number): Promise<string | undefined>
}

function secretKeys(secrets: readonly SettingsSecretView[], server: string, field: 'env' | 'headers'): Set<string> {
  return new Set(secrets.flatMap((secret) => {
    const [servers, name, section, key] = secret.path
    return secret.set && servers === 'servers' && name === server && section === field && key !== undefined ? [key] : []
  }))
}

function secretDraft(keys: ReadonlySet<string>): string {
  return [...keys].sort().map(key => `${key}=`).join('\n')
}

function parsePairs(text: string): PairParse {
  const entries = new Map<string, string>()
  let invalid = false
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line === '') continue
    const split = line.indexOf('=')
    if (split <= 0) { invalid = true; continue }
    const key = line.slice(0, split).trim()
    if (key === '' || entries.has(key)) { invalid = true; continue }
    entries.set(key, line.slice(split + 1))
  }
  return { entries, invalid }
}

function draftFor(
  name: string,
  server: McpServerSettingsView,
  secrets: readonly SettingsSecretView[],
): EditorDraft {
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
  }
}

function emptyDraft(): EditorDraft {
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
  }
}

function appendSecretOps(
  ops: SettingsPathOpView[],
  serverName: string,
  field: 'env' | 'headers',
  parsed: ReadonlyMap<string, string>,
  existing: ReadonlySet<string>,
): void {
  for (const key of existing) {
    if (!parsed.has(key)) ops.push({ op: 'unset', path: ['servers', serverName, field, key] })
  }
  for (const [key, value] of parsed) {
    if (value === '' && existing.has(key)) continue
    ops.push({ op: 'set', path: ['servers', serverName, field, key], value })
  }
}

/** Render the server list, staged editor, and delete confirmation. */
export function McpServersTab(props: McpServersTabProps) {
  const { t } = props
  const state = props.useMcpServers(snapshot => snapshot)
  const [draft, setDraft] = useState<EditorDraft>()
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string>()
  const [deleting, setDeleting] = useState<string>()
  const [deletingBusy, setDeletingBusy] = useState(false)
  const servers = state.value?.servers ?? {}
  const names = Object.keys(servers).sort((left, right) => left.localeCompare(right))
  const env = useMemo(() => draft === undefined ? undefined : parsePairs(draft.env), [draft])
  const headers = useMemo(() => draft === undefined ? undefined : parsePairs(draft.headers), [draft])
  const existingEnv = draft?.originalName === undefined
    ? new Set<string>()
    : secretKeys(state.secrets, draft.originalName, 'env')
  const existingHeaders = draft?.originalName === undefined
    ? new Set<string>()
    : secretKeys(state.secrets, draft.originalName, 'headers')
  const missingNewSecret = (parsed: PairParse | undefined, existing: ReadonlySet<string>): boolean =>
    parsed !== undefined && [...parsed.entries].some(([key, value]) => value === '' && !existing.has(key))
  const duplicateName = draft !== undefined && draft.originalName === undefined && Object.hasOwn(servers, draft.name.trim())
  const invalid = draft === undefined
    || !SERVER_NAME_PATTERN.test(draft.name.trim())
    || duplicateName
    || (draft.enabled && draft.transport === 'stdio' && draft.command.trim() === '')
    || (draft.enabled && draft.transport === 'streamable-http' && draft.url.trim() === '')
    || env?.invalid === true
    || headers?.invalid === true
    || missingNewSecret(env, existingEnv)
    || missingNewSecret(headers, existingHeaders)

  useEffect(() => {
    if (draft?.originalName !== undefined && !Object.hasOwn(servers, draft.originalName)) setDraft(undefined)
  }, [draft?.originalName, servers])

  if (state.status === 'loading') return null
  if (state.status !== 'ready') return <p className="dsh-mcp-notice">{t('unavailable')}</p>

  const updateDraft = (patch: Partial<EditorDraft>): void => {
    setFailure(undefined)
    setDraft(current => current === undefined ? current : { ...current, ...patch })
  }

  const save = (): void => {
    if (draft === undefined || invalid || state.revision === undefined || env === undefined || headers === undefined) return
    const name = draft.name.trim()
    const args = draft.args.split('\n').map(value => value.trim()).filter(value => value !== '')
    const ops: SettingsPathOpView[] = []
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
      })
    } else {
      const root = ['servers', name]
      ops.push(
        { op: 'set', path: [...root, 'enabled'], value: draft.enabled },
        { op: 'set', path: [...root, 'transport'], value: draft.transport },
        { op: 'set', path: [...root, 'command'], value: draft.command.trim() },
        { op: 'set', path: [...root, 'args'], value: args },
        { op: 'set', path: [...root, 'cwd'], value: draft.cwd.trim() },
        { op: 'set', path: [...root, 'url'], value: draft.url.trim() },
      )
      appendSecretOps(ops, name, 'env', env.entries, existingEnv)
      appendSecretOps(ops, name, 'headers', headers.entries, existingHeaders)
    }
    setSaving(true)
    setFailure(undefined)
    void props.mutate(ops, state.revision).then((message) => {
      if (message === undefined) setDraft(undefined)
      else setFailure(message)
    }).finally(() => { setSaving(false) })
  }

  const remove = (): void => {
    if (deleting === undefined || state.revision === undefined) return
    setDeletingBusy(true)
    setFailure(undefined)
    void props.mutate([{ op: 'unset', path: ['servers', deleting] }], state.revision).then((message) => {
      if (message === undefined) setDeleting(undefined)
      else setFailure(message)
    }).finally(() => { setDeletingBusy(false) })
  }

  return (
    <div className="dsh-mcp-section">
      <div className="dsh-mcp-heading">
        <div>
          <h3 className="dsh-mcp-title">{t('title')}</h3>
          <p className="dsh-mcp-intro">{t('description')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={<IconPlusOutline16 size={14} />}
          disabled={!state.writable || draft !== undefined}
          onClick={() => { setFailure(undefined); setDraft(emptyDraft()) }}
        >
          {t('add')}
        </Button>
      </div>
      {!state.writable ? <p className="dsh-mcp-notice">{t('readOnly')}</p> : null}
      {names.length === 0 && draft === undefined ? <p className="dsh-mcp-empty">{t('empty')}</p> : null}
      <ul className="dsh-mcp-list">
        {names.map((name) => {
          const server = servers[name] as McpServerSettingsView
          return (
            <li key={name} className="dsh-mcp-card">
              <div className="dsh-mcp-card-head">
                <div className="dsh-mcp-identity">
                  <span className="dsh-mcp-name">{name}</span>
                  <span className="dsh-mcp-transport">{server.transport === 'stdio' ? 'stdio' : 'HTTP'}</span>
                  {!server.enabled ? <span className="dsh-mcp-disabled">{t('disabled')}</span> : null}
                </div>
                <div className="dsh-mcp-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!state.writable || draft !== undefined}
                    onClick={() => { setFailure(undefined); setDraft(draftFor(name, server, state.secrets)) }}
                  >
                    {t('edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="dsh-mcp-danger"
                    disabled={!state.writable || draft !== undefined}
                    onClick={() => { setFailure(undefined); setDeleting(name) }}
                  >
                    {t('delete')}
                  </Button>
                </div>
              </div>
              <p className="dsh-mcp-endpoint">{server.transport === 'stdio' ? [server.command, ...server.args].join(' ') : server.url}</p>
              {draft?.originalName === name
                ? renderEditor(draft, updateDraft, save, () => { setDraft(undefined) }, invalid, saving, failure, t)
                : null}
            </li>
          )
        })}
      </ul>
      {draft !== undefined && draft.originalName === undefined ? (
        <div className="dsh-mcp-add-editor">
          {renderEditor(draft, updateDraft, save, () => { setDraft(undefined) }, invalid, saving, failure, t)}
        </div>
      ) : null}
      <Modal
        open={deleting !== undefined}
        onClose={() => { if (!deletingBusy) setDeleting(undefined) }}
        title={t('deleteTitle').replace('{name}', deleting ?? '')}
        closeLabel={t('close')}
        description={t('deleteDescription')}
        footer={(
          <>
            <Button variant="outline" disabled={deletingBusy} onClick={() => { setDeleting(undefined) }}>{t('cancel')}</Button>
            <Button variant="outline" className="dsh-mcp-danger" disabled={deletingBusy} onClick={remove}>
              {deletingBusy ? t('deleting') : t('delete')}
            </Button>
          </>
        )}
      >
        {failure === undefined ? null : <p className="dsh-mcp-error">{failure}</p>}
      </Modal>
    </div>
  )
}

function renderEditor(
  draft: EditorDraft,
  update: (patch: Partial<EditorDraft>) => void,
  save: () => void,
  cancel: () => void,
  invalid: boolean,
  saving: boolean,
  failure: string | undefined,
  t: McpServersTabProps['t'],
) {
  const prefix = draft.originalName === undefined ? 'mcp-add' : `mcp-${draft.originalName}`
  return (
    <div className="dsh-mcp-editor">
      <label className="dsh-mcp-field">
        <span>{t('name')}</span>
        <input aria-label={t('name')} value={draft.name} disabled={draft.originalName !== undefined || saving} placeholder={t('namePlaceholder')} onChange={(event) => { update({ name: event.target.value }) }} />
      </label>
      <label className="dsh-mcp-check">
        <input type="checkbox" checked={draft.enabled} disabled={saving} onChange={(event) => { update({ enabled: event.target.checked }) }} />
        <span>{t('enabled')}</span>
      </label>
      <label className="dsh-mcp-field" htmlFor={`${prefix}-transport`}>
        <span>{t('transport')}</span>
        <select id={`${prefix}-transport`} value={draft.transport} disabled={saving} onChange={(event) => { update({ transport: event.target.value as EditorDraft['transport'] }) }}>
          <option value="stdio">{t('stdio')}</option>
          <option value="streamable-http">{t('http')}</option>
        </select>
      </label>
      {draft.transport === 'stdio' ? (
        <>
          <label className="dsh-mcp-field">
            <span>{t('command')}</span>
            <input aria-label={t('command')} value={draft.command} disabled={saving} placeholder="npx" onChange={(event) => { update({ command: event.target.value }) }} />
          </label>
          <label className="dsh-mcp-field">
            <span>{t('args')}</span>
            <textarea aria-label={t('args')} value={draft.args} disabled={saving} placeholder={t('argsPlaceholder')} onChange={(event) => { update({ args: event.target.value }) }} />
          </label>
          <label className="dsh-mcp-field">
            <span>{t('cwd')}</span>
            <input aria-label={t('cwd')} value={draft.cwd} disabled={saving} placeholder={t('optional')} onChange={(event) => { update({ cwd: event.target.value }) }} />
          </label>
          <label className="dsh-mcp-field">
            <span>{t('env')}</span>
            <textarea aria-label={t('env')} value={draft.env} disabled={saving} placeholder={t('pairsPlaceholder')} onChange={(event) => { update({ env: event.target.value }) }} />
            <small>{t('secretHint')}</small>
          </label>
        </>
      ) : (
        <>
          <label className="dsh-mcp-field">
            <span>{t('url')}</span>
            <input aria-label={t('url')} value={draft.url} disabled={saving} placeholder="https://example.com/mcp" onChange={(event) => { update({ url: event.target.value }) }} />
          </label>
          <label className="dsh-mcp-field">
            <span>{t('headers')}</span>
            <textarea aria-label={t('headers')} value={draft.headers} disabled={saving} placeholder={t('pairsPlaceholder')} onChange={(event) => { update({ headers: event.target.value }) }} />
            <small>{t('secretHint')}</small>
          </label>
        </>
      )}
      {invalid ? <p className="dsh-mcp-error">{t('invalid')}</p> : null}
      {failure === undefined ? null : <p className="dsh-mcp-error">{failure}</p>}
      <div className="dsh-mcp-editor-actions">
        <Button variant="outline" disabled={saving} onClick={cancel}>{t('cancel')}</Button>
        <Button variant="primary" disabled={invalid || saving} onClick={save}>{saving ? t('saving') : t('save')}</Button>
      </div>
    </div>
  )
}
