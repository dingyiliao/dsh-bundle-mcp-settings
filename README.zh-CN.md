# DSH MCP 设置 Bundle

[English](./README.md) | [简体中文](./README.zh-CN.md)

这是一个可独立安装的 DeepSeek Harness Bundle：可以在
**设置 → 插件 → MCP** 中管理多个 stdio 或 Streamable HTTP MCP server，
并在运行时把它们提供的工具挂载到 Agent。

## 包含内容

- Host 插件：注册 `mcp` settings namespace，并为每条启用的 server 创建一个
  官方 `@deepseek-ai/dsh-mcp-client` Fiber。
- Client 插件：向现有的 `settings.plugins.tab` slot 注册 MCP 管理页面。
- Bundle patch：把 Host 与 Client 两个 face 作为一个 Profile 功能进行安装。

本 Bundle 不重新实现 MCP 协议，只管理 DSH 现有 MCP client 的配置与生命周期。
修改一条 server 只会替换对应的 Fiber；未变化的连接会继续保留。

## 兼容性

当前版本面向 DeepSeek Harness `0.1.6-alpha.1` 及使用同代 API 的兼容版本。
目标 Profile 需要已经包含：

- `@deepseek-ai/dsh-settings` 与可写的 settings provider；
- `@deepseek-ai/dsh-mcp-client`、`tools` 和 `mcp-resources`；
- Web/Desktop Client 的 Settings、Plugins、Remotes 与 Slots 基础插件。

当前官方 Web/Desktop 组合已经提供这些依赖；本 Bundle 不会下载或替换它们。
仓库提交了 Host 和 Client 构建产物，因此从 GitHub 安装时不会执行 `prepare`
或其他包安装脚本。

## 安装

```bash
dsh plugin --profile web add github:dingyiliao/dsh-bundle-mcp-settings#v0.1.1
```

安装后重启 DSH。版本标签便于安装；如果需要更严格的供应链固定，可以把
`v0.1.1` 换成对应的完整 commit SHA。

正式打包的 Desktop 应用目前只接受 npm registry 包，不能直接接收
`github:` spec。该场景需要把 Bundle 发布到 npm，或者让 Desktop 增加
GitHub source 支持。

## 配置与持久化

Bundle patch 只负责挂载管理插件：

```yaml
- insert:
    - id: managed-mcp-settings
      name: '@dingyiliao/dsh-mcp-settings'
```

它不会把 MCP server 存放在 patch 里。没有用户设置时，插件 schema 会提供
空的默认值；在 UI 中进行的修改，则由 Profile 的 settings provider 持久化到
`mcp` namespace。最终配置按照下面的顺序解析：

```text
schema 默认值 → composition base → 持久化用户配置
```

因此，重启 DSH、重新加载 Bundle 或重复挂载同一个 patch，都不会清空已经保存的
server。

持久化文档使用 `mcp.servers`：

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

`env` 与 HTTP `headers` 使用 settings schema 的 secret role。读取设置时只会返回
哪些 secret key 已配置，不会把值发送给浏览器；编辑器里已有的 `NAME=` 表示
“保留这个 secret，不作修改”。

MCP server 进程及其安装脚本运行在 Agent 沙箱之外。请只配置你信任的命令、
软件包和远程端点。

## 开发

```bash
pnpm install
pnpm check
```

Client 产物遵循 DSH 动态模块格式：`lib/client.js` 调用
`window.__ModuleLoader__.load(...)`，并从宿主模块表解析 React、Cordis 与 UI
primitives。Host 和 Client 构建产物均提交到仓库，供 GitHub spec 直接安装。

## License

MIT
