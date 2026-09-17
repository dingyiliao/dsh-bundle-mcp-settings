# DSH MCP Settings Bundle

一个可独立安装的 DeepSeek Harness Bundle：在 **设置 → 插件 → MCP** 中管理多个 stdio 或 Streamable HTTP MCP server，并把它们的工具动态挂载到 Agent。

## 包含内容

- Host 插件：注册 `mcp` settings namespace，并为每条启用的记录创建一个官方 `@deepseek-ai/dsh-mcp-client` Fiber。
- Client 插件：向现有的 `settings.plugins.tab` slot 注册 MCP 管理页面。
- Bundle patch：把 Host 与 Client 两个 face 作为一个可安装功能加入 Profile。

Bundle 不重新实现 MCP 协议，只管理 DSH 已有 MCP client 的配置与生命周期。修改一条 server 只会替换对应 Fiber；未变化的连接会保留。

## 兼容性

当前版本面向 DeepSeek Harness `0.1.6-alpha.1` 及其后的同代 API，要求目标 Profile 已包含：

- `@deepseek-ai/dsh-settings` 与可写 settings provider；
- `@deepseek-ai/dsh-mcp-client`、`tools` 和 `mcp-resources`；
- Web/Desktop Client 的 Settings、Plugins、Remote 与 Slots 基础插件。

这些依赖由当前官方 Web/Desktop 组合提供，不由本 Bundle 下载或替换。仓库提交了构建产物，因此从 GitHub 安装不会执行 `prepare` 或其他安装脚本。

## 安装

```bash
dsh plugin --profile web add github:dingyiliao/dsh-bundle-mcp-settings#<commit-sha>
```

安装后重启 DSH。建议固定 commit SHA，避免仓库后续更新静默改变本地执行的代码。

正式打包的 Desktop 目前只接受 npm registry 包，不能直接接收 `github:` spec；该场景需要等待发布到 npm，或由 Desktop 后续增加 GitHub source 支持。

## 配置行为

设置文档使用 `mcp.servers`：

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

`env` 与 HTTP `headers` 使用 settings schema 的 secret role。读取设置时只返回“哪些 key 已配置”，不会把值发送给浏览器；编辑器中已有的 `NAME=` 表示保留该 secret。

MCP server 进程及其安装脚本位于 Agent 沙箱之外。只配置你信任的命令、包与远程端点。

## 开发

```bash
pnpm install
pnpm check
```

Client 产物遵守 DSH 动态模块格式：`lib/client.js` 调用 `window.__ModuleLoader__.load(...)`，并把 React、Cordis 与 UI primitives 解析到宿主模块表。Host 和 Client 构建产物均提交到仓库，供 GitHub spec 直接安装。

## License

MIT
