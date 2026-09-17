# DSH MCP Settings Bundle

[English](./README.md) | [简体中文](./README.zh-CN.md)

An installable DeepSeek Harness bundle for managing multiple stdio and
Streamable HTTP MCP servers from **Settings → Plugins → MCP**, then exposing
their tools to the Agent at runtime.

## What is included

- A Host plugin that registers the `mcp` settings namespace and creates one
  official `@deepseek-ai/dsh-mcp-client` Fiber for each enabled server.
- A Client plugin that contributes an MCP management tab to the existing
  `settings.plugins.tab` slot.
- A bundle patch that installs both faces as one Profile feature.

This bundle does not reimplement MCP. It manages the configuration and
lifecycle of DSH's existing MCP client. Editing one server replaces only that
server's Fiber; unchanged connections stay mounted.

## Compatibility

The current release targets DeepSeek Harness `0.1.6-alpha.1` and compatible
versions of the same APIs. The target Profile must already provide:

- `@deepseek-ai/dsh-settings` and a writable settings provider;
- `@deepseek-ai/dsh-mcp-client`, `tools`, and `mcp-resources`;
- the Web/Desktop Client Settings, Plugins, Remotes, and Slots foundation.

The official Web/Desktop compositions currently provide these dependencies.
They are not downloaded or replaced by this bundle. Built Host and Client
artifacts are committed, so installing from GitHub does not run `prepare` or
another package installation script.

## Install

```bash
dsh plugin --profile web add github:dingyiliao/dsh-bundle-mcp-settings#v0.1.1
```

Restart DSH after installation. A version tag is convenient; for stricter
supply-chain pinning, replace `v0.1.1` with its full commit SHA.

The packaged Desktop application currently accepts npm-registry packages only,
not a direct `github:` spec. That path requires publishing this bundle to npm
or adding GitHub-source support to Desktop.

## Configuration and persistence

The bundle patch only mounts the manager:

```yaml
- insert:
    - id: managed-mcp-settings
      name: '@dingyiliao/dsh-mcp-settings'
```

It intentionally does not store MCP servers in the patch. The plugin schema
supplies an empty default when no settings exist, while edits made in the UI
are persisted by the Profile's settings provider under the `mcp` namespace.
Resolution follows this order:

```text
schema defaults → composition base → persisted user section
```

Therefore restarting DSH, reloading the bundle, or mounting the same patch does
not reset saved servers.

The persisted document uses `mcp.servers`:

```yaml
mcp:
  servers:
    filesystem:
      enabled: true
      transport: stdio
      command: npx
      args:
        - -y
        - '@modelcontextprotocol/server-filesystem'
        - /path/to/workspace
      env: {}
      cwd: ''
      url: ''
      headers: {}
      toolCallTimeoutMs: 60000
      failOnStartupError: false
      maxInstructionBytes: 32768
      reconnect:
        enabled: true
        initialDelayMs: 500
        maxDelayMs: 30000
        maxAttempts: 10
```

`env` and HTTP `headers` use the settings schema's secret role. Settings reads
return only which secret keys exist; values are never sent to the browser. An
existing `NAME=` entry in the editor means “keep this secret unchanged.”

MCP server processes and their installation scripts run outside the Agent
sandbox. Configure only commands, packages, and remote endpoints you trust.

## Development

```bash
pnpm install
pnpm check
```

The Client artifact follows DSH's dynamic-module format: `lib/client.js` calls
`window.__ModuleLoader__.load(...)` and resolves React, Cordis, and UI
primitives from the host module table. Built Host and Client artifacts are
committed so a GitHub-spec installation can load them directly.

## License

MIT
