window.__ModuleLoader__.load({
	id: "@dingyiliao/dsh-mcp-settings",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region lib/types/client/McpServersTab.js
		/** Settings tab for user-managed stdio and Streamable HTTP MCP servers. */
		const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
		function secretKeys(secrets, server, field) {
			return new Set(secrets.flatMap((secret) => {
				const [servers, name, section, key] = secret.path;
				return secret.set && servers === "servers" && name === server && section === field && key !== void 0 ? [key] : [];
			}));
		}
		function secretDraft(keys) {
			return [...keys].sort().map((key) => `${key}=`).join("\n");
		}
		function parsePairs(text) {
			const entries = /* @__PURE__ */ new Map();
			let invalid = false;
			for (const raw of text.split("\n")) {
				const line = raw.trim();
				if (line === "") continue;
				const split = line.indexOf("=");
				if (split <= 0) {
					invalid = true;
					continue;
				}
				const key = line.slice(0, split).trim();
				if (key === "" || entries.has(key)) {
					invalid = true;
					continue;
				}
				entries.set(key, line.slice(split + 1));
			}
			return {
				entries,
				invalid
			};
		}
		function draftFor(name, server, secrets) {
			return {
				originalName: name,
				name,
				enabled: server.enabled,
				transport: server.transport,
				command: server.command,
				args: server.args.join("\n"),
				cwd: server.cwd,
				url: server.url,
				env: secretDraft(secretKeys(secrets, name, "env")),
				headers: secretDraft(secretKeys(secrets, name, "headers"))
			};
		}
		function emptyDraft() {
			return {
				originalName: void 0,
				name: "",
				enabled: true,
				transport: "stdio",
				command: "",
				args: "",
				cwd: "",
				url: "",
				env: "",
				headers: ""
			};
		}
		function appendSecretOps(ops, serverName, field, parsed, existing) {
			for (const key of existing) if (!parsed.has(key)) ops.push({
				op: "unset",
				path: [
					"servers",
					serverName,
					field,
					key
				]
			});
			for (const [key, value] of parsed) {
				if (value === "" && existing.has(key)) continue;
				ops.push({
					op: "set",
					path: [
						"servers",
						serverName,
						field,
						key
					],
					value
				});
			}
		}
		/** Render the server list, staged editor, and delete confirmation. */
		function McpServersTab(props) {
			const { t } = props;
			const state = props.useMcpServers((snapshot) => snapshot);
			const [draft, setDraft] = (0, react.useState)();
			const [saving, setSaving] = (0, react.useState)(false);
			const [failure, setFailure] = (0, react.useState)();
			const [deleting, setDeleting] = (0, react.useState)();
			const [deletingBusy, setDeletingBusy] = (0, react.useState)(false);
			const servers = state.value?.servers ?? {};
			const names = Object.keys(servers).sort((left, right) => left.localeCompare(right));
			const env = (0, react.useMemo)(() => draft === void 0 ? void 0 : parsePairs(draft.env), [draft]);
			const headers = (0, react.useMemo)(() => draft === void 0 ? void 0 : parsePairs(draft.headers), [draft]);
			const existingEnv = draft?.originalName === void 0 ? /* @__PURE__ */ new Set() : secretKeys(state.secrets, draft.originalName, "env");
			const existingHeaders = draft?.originalName === void 0 ? /* @__PURE__ */ new Set() : secretKeys(state.secrets, draft.originalName, "headers");
			const missingNewSecret = (parsed, existing) => parsed !== void 0 && [...parsed.entries].some(([key, value]) => value === "" && !existing.has(key));
			const duplicateName = draft !== void 0 && draft.originalName === void 0 && Object.hasOwn(servers, draft.name.trim());
			const invalid = draft === void 0 || !SERVER_NAME_PATTERN.test(draft.name.trim()) || duplicateName || draft.enabled && draft.transport === "stdio" && draft.command.trim() === "" || draft.enabled && draft.transport === "streamable-http" && draft.url.trim() === "" || env?.invalid === true || headers?.invalid === true || missingNewSecret(env, existingEnv) || missingNewSecret(headers, existingHeaders);
			(0, react.useEffect)(() => {
				if (draft?.originalName !== void 0 && !Object.hasOwn(servers, draft.originalName)) setDraft(void 0);
			}, [draft?.originalName, servers]);
			if (state.status === "loading") return null;
			if (state.status !== "ready") return (0, react_jsx_runtime.jsx)("p", {
				className: "dsh-mcp-notice",
				children: t("unavailable")
			});
			const updateDraft = (patch) => {
				setFailure(void 0);
				setDraft((current) => current === void 0 ? current : {
					...current,
					...patch
				});
			};
			const save = () => {
				if (draft === void 0 || invalid || state.revision === void 0 || env === void 0 || headers === void 0) return;
				const name = draft.name.trim();
				const args = draft.args.split("\n").map((value) => value.trim()).filter((value) => value !== "");
				const ops = [];
				if (draft.originalName === void 0) ops.push({
					op: "set",
					path: ["servers", name],
					value: {
						enabled: draft.enabled,
						transport: draft.transport,
						command: draft.command.trim(),
						args,
						cwd: draft.cwd.trim(),
						url: draft.url.trim(),
						env: Object.fromEntries(env.entries),
						headers: Object.fromEntries(headers.entries)
					}
				});
				else {
					const root = ["servers", name];
					ops.push({
						op: "set",
						path: [...root, "enabled"],
						value: draft.enabled
					}, {
						op: "set",
						path: [...root, "transport"],
						value: draft.transport
					}, {
						op: "set",
						path: [...root, "command"],
						value: draft.command.trim()
					}, {
						op: "set",
						path: [...root, "args"],
						value: args
					}, {
						op: "set",
						path: [...root, "cwd"],
						value: draft.cwd.trim()
					}, {
						op: "set",
						path: [...root, "url"],
						value: draft.url.trim()
					});
					appendSecretOps(ops, name, "env", env.entries, existingEnv);
					appendSecretOps(ops, name, "headers", headers.entries, existingHeaders);
				}
				setSaving(true);
				setFailure(void 0);
				props.mutate(ops, state.revision).then((message) => {
					if (message === void 0) setDraft(void 0);
					else setFailure(message);
				}).finally(() => {
					setSaving(false);
				});
			};
			const remove = () => {
				if (deleting === void 0 || state.revision === void 0) return;
				setDeletingBusy(true);
				setFailure(void 0);
				props.mutate([{
					op: "unset",
					path: ["servers", deleting]
				}], state.revision).then((message) => {
					if (message === void 0) setDeleting(void 0);
					else setFailure(message);
				}).finally(() => {
					setDeletingBusy(false);
				});
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-mcp-section",
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-mcp-heading",
						children: [(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("h3", {
							className: "dsh-mcp-title",
							children: t("title")
						}), (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-mcp-intro",
							children: t("description")
						})] }), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							size: "sm",
							icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 }),
							disabled: !state.writable || draft !== void 0,
							onClick: () => {
								setFailure(void 0);
								setDraft(emptyDraft());
							},
							children: t("add")
						})]
					}),
					!state.writable ? (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-mcp-notice",
						children: t("readOnly")
					}) : null,
					names.length === 0 && draft === void 0 ? (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-mcp-empty",
						children: t("empty")
					}) : null,
					(0, react_jsx_runtime.jsx)("ul", {
						className: "dsh-mcp-list",
						children: names.map((name) => {
							const server = servers[name];
							return (0, react_jsx_runtime.jsxs)("li", {
								className: "dsh-mcp-card",
								children: [
									(0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-mcp-card-head",
										children: [(0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-mcp-identity",
											children: [
												(0, react_jsx_runtime.jsx)("span", {
													className: "dsh-mcp-name",
													children: name
												}),
												(0, react_jsx_runtime.jsx)("span", {
													className: "dsh-mcp-transport",
													children: server.transport === "stdio" ? "stdio" : "HTTP"
												}),
												!server.enabled ? (0, react_jsx_runtime.jsx)("span", {
													className: "dsh-mcp-disabled",
													children: t("disabled")
												}) : null
											]
										}), (0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-mcp-actions",
											children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												size: "sm",
												disabled: !state.writable || draft !== void 0,
												onClick: () => {
													setFailure(void 0);
													setDraft(draftFor(name, server, state.secrets));
												},
												children: t("edit")
											}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												size: "sm",
												className: "dsh-mcp-danger",
												disabled: !state.writable || draft !== void 0,
												onClick: () => {
													setFailure(void 0);
													setDeleting(name);
												},
												children: t("delete")
											})]
										})]
									}),
									(0, react_jsx_runtime.jsx)("p", {
										className: "dsh-mcp-endpoint",
										children: server.transport === "stdio" ? [server.command, ...server.args].join(" ") : server.url
									}),
									draft?.originalName === name ? renderEditor(draft, updateDraft, save, () => {
										setDraft(void 0);
									}, invalid, saving, failure, t) : null
								]
							}, name);
						})
					}),
					draft !== void 0 && draft.originalName === void 0 ? (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-mcp-add-editor",
						children: renderEditor(draft, updateDraft, save, () => {
							setDraft(void 0);
						}, invalid, saving, failure, t)
					}) : null,
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: deleting !== void 0,
						onClose: () => {
							if (!deletingBusy) setDeleting(void 0);
						},
						title: t("deleteTitle").replace("{name}", deleting ?? ""),
						closeLabel: t("close"),
						description: t("deleteDescription"),
						footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							disabled: deletingBusy,
							onClick: () => {
								setDeleting(void 0);
							},
							children: t("cancel")
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							className: "dsh-mcp-danger",
							disabled: deletingBusy,
							onClick: remove,
							children: deletingBusy ? t("deleting") : t("delete")
						})] }),
						children: failure === void 0 ? null : (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-mcp-error",
							children: failure
						})
					})
				]
			});
		}
		function renderEditor(draft, update, save, cancel, invalid, saving, failure, t) {
			const prefix = draft.originalName === void 0 ? "mcp-add" : `mcp-${draft.originalName}`;
			return (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-mcp-editor",
				children: [
					(0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-mcp-field",
						children: [(0, react_jsx_runtime.jsx)("span", { children: t("name") }), (0, react_jsx_runtime.jsx)("input", {
							"aria-label": t("name"),
							value: draft.name,
							disabled: draft.originalName !== void 0 || saving,
							placeholder: t("namePlaceholder"),
							onChange: (event) => {
								update({ name: event.target.value });
							}
						})]
					}),
					(0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-mcp-check",
						children: [(0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: draft.enabled,
							disabled: saving,
							onChange: (event) => {
								update({ enabled: event.target.checked });
							}
						}), (0, react_jsx_runtime.jsx)("span", { children: t("enabled") })]
					}),
					(0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-mcp-field",
						htmlFor: `${prefix}-transport`,
						children: [(0, react_jsx_runtime.jsx)("span", { children: t("transport") }), (0, react_jsx_runtime.jsxs)("select", {
							id: `${prefix}-transport`,
							value: draft.transport,
							disabled: saving,
							onChange: (event) => {
								update({ transport: event.target.value });
							},
							children: [(0, react_jsx_runtime.jsx)("option", {
								value: "stdio",
								children: t("stdio")
							}), (0, react_jsx_runtime.jsx)("option", {
								value: "streamable-http",
								children: t("http")
							})]
						})]
					}),
					draft.transport === "stdio" ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						(0, react_jsx_runtime.jsxs)("label", {
							className: "dsh-mcp-field",
							children: [(0, react_jsx_runtime.jsx)("span", { children: t("command") }), (0, react_jsx_runtime.jsx)("input", {
								"aria-label": t("command"),
								value: draft.command,
								disabled: saving,
								placeholder: "npx",
								onChange: (event) => {
									update({ command: event.target.value });
								}
							})]
						}),
						(0, react_jsx_runtime.jsxs)("label", {
							className: "dsh-mcp-field",
							children: [(0, react_jsx_runtime.jsx)("span", { children: t("args") }), (0, react_jsx_runtime.jsx)("textarea", {
								"aria-label": t("args"),
								value: draft.args,
								disabled: saving,
								placeholder: t("argsPlaceholder"),
								onChange: (event) => {
									update({ args: event.target.value });
								}
							})]
						}),
						(0, react_jsx_runtime.jsxs)("label", {
							className: "dsh-mcp-field",
							children: [(0, react_jsx_runtime.jsx)("span", { children: t("cwd") }), (0, react_jsx_runtime.jsx)("input", {
								"aria-label": t("cwd"),
								value: draft.cwd,
								disabled: saving,
								placeholder: t("optional"),
								onChange: (event) => {
									update({ cwd: event.target.value });
								}
							})]
						}),
						(0, react_jsx_runtime.jsxs)("label", {
							className: "dsh-mcp-field",
							children: [
								(0, react_jsx_runtime.jsx)("span", { children: t("env") }),
								(0, react_jsx_runtime.jsx)("textarea", {
									"aria-label": t("env"),
									value: draft.env,
									disabled: saving,
									placeholder: t("pairsPlaceholder"),
									onChange: (event) => {
										update({ env: event.target.value });
									}
								}),
								(0, react_jsx_runtime.jsx)("small", { children: t("secretHint") })
							]
						})
					] }) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-mcp-field",
						children: [(0, react_jsx_runtime.jsx)("span", { children: t("url") }), (0, react_jsx_runtime.jsx)("input", {
							"aria-label": t("url"),
							value: draft.url,
							disabled: saving,
							placeholder: "https://example.com/mcp",
							onChange: (event) => {
								update({ url: event.target.value });
							}
						})]
					}), (0, react_jsx_runtime.jsxs)("label", {
						className: "dsh-mcp-field",
						children: [
							(0, react_jsx_runtime.jsx)("span", { children: t("headers") }),
							(0, react_jsx_runtime.jsx)("textarea", {
								"aria-label": t("headers"),
								value: draft.headers,
								disabled: saving,
								placeholder: t("pairsPlaceholder"),
								onChange: (event) => {
									update({ headers: event.target.value });
								}
							}),
							(0, react_jsx_runtime.jsx)("small", { children: t("secretHint") })
						]
					})] }),
					invalid ? (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-mcp-error",
						children: t("invalid")
					}) : null,
					failure === void 0 ? null : (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-mcp-error",
						children: failure
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-mcp-editor-actions",
						children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							disabled: saving,
							onClick: cancel,
							children: t("cancel")
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							disabled: invalid || saving,
							onClick: save,
							children: saving ? t("saving") : t("save")
						})]
					})
				]
			});
		}
		function isMcpSettingsView(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) && typeof Reflect.get(value, "servers") === "object" && Reflect.get(value, "servers") !== null && !Array.isArray(Reflect.get(value, "servers"));
		}
		/** Observable projection of the shared settings mirror onto the MCP namespace. */
		var McpSettingsController = class {
			ctx;
			mirror;
			listeners = /* @__PURE__ */ new Set();
			snapshot = {
				status: "loading",
				value: void 0,
				revision: void 0,
				writable: false,
				secrets: []
			};
			unsubscribe;
			constructor(ctx, mirror) {
				this.ctx = ctx;
				this.mirror = mirror;
				this.unsubscribe = mirror.subscribe(() => {
					this.derive();
				});
				this.derive();
				mirror.ensure().then(() => {
					this.derive();
				});
			}
			getSnapshot = () => this.snapshot;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			/** Persist one revision-fenced set of MCP server edits. */
			async mutate(ops, revision) {
				const response = await this.ctx.remote.settings.mutate("mcp", [...ops], revision);
				if (!response.ok) return response.error.message;
				this.mirror.acceptView(response.value);
			}
			dispose() {
				this.unsubscribe();
				this.listeners.clear();
			}
			derive() {
				const source = this.mirror.getSnapshot();
				const view = source.view?.namespaces.find((candidate) => candidate.ns === "mcp");
				this.snapshot = view !== void 0 && isMcpSettingsView(view.value) ? {
					status: "ready",
					value: view.value,
					revision: view.revision,
					writable: source.view?.writable ?? false,
					secrets: view.secrets
				} : {
					status: source.status === "idle" || source.status === "loading" ? "loading" : "unavailable",
					value: void 0,
					revision: void 0,
					writable: source.view?.writable ?? false,
					secrets: []
				};
				for (const listener of this.listeners) listener();
			}
		};
		//#endregion
		//#region lib/types/client/locales.js
		const en = {
			tab: "MCP",
			title: "MCP servers",
			description: "Connect local commands or Streamable HTTP endpoints and expose their tools to agents.",
			add: "Add server",
			empty: "No MCP servers are configured.",
			unavailable: "MCP settings are not available in this deployment.",
			readOnly: "This deployment stores settings read-only.",
			disabled: "Disabled",
			edit: "Edit",
			delete: "Delete",
			deleteTitle: "Delete {name}?",
			deleteDescription: "The server disconnects immediately and its tools are removed from new model requests.",
			deleting: "Deleting…",
			close: "Close",
			cancel: "Cancel",
			name: "Server name",
			namePlaceholder: "github",
			enabled: "Enabled",
			transport: "Transport",
			stdio: "Local command (stdio)",
			http: "Streamable HTTP",
			command: "Command",
			args: "Arguments",
			argsPlaceholder: "One argument per line",
			cwd: "Working directory",
			optional: "Optional",
			env: "Environment variables",
			url: "Endpoint URL",
			headers: "Request headers",
			pairsPlaceholder: "One NAME=value per line",
			secretHint: "Values are stored as write-only secrets. Leave an existing value blank to keep it.",
			invalid: "Complete the required fields and enter each secret as NAME=value.",
			save: "Save",
			saving: "Saving…"
		};
		const zh = {
			tab: "MCP",
			title: "MCP 服务器",
			description: "连接本地命令或 Streamable HTTP 端点，并将其中的工具提供给 Agent。",
			add: "添加服务器",
			empty: "尚未配置 MCP 服务器。",
			unavailable: "当前部署没有提供 MCP 设置。",
			readOnly: "本部署的设置为只读。",
			disabled: "已停用",
			edit: "编辑",
			delete: "删除",
			deleteTitle: "删除 {name}？",
			deleteDescription: "服务器会立即断开，其工具也会从后续模型请求中移除。",
			deleting: "删除中…",
			close: "关闭",
			cancel: "取消",
			name: "服务器名称",
			namePlaceholder: "github",
			enabled: "启用",
			transport: "传输方式",
			stdio: "本地命令（stdio）",
			http: "Streamable HTTP",
			command: "命令",
			args: "参数",
			argsPlaceholder: "每行一个参数",
			cwd: "工作目录",
			optional: "可选",
			env: "环境变量",
			url: "端点 URL",
			headers: "请求头",
			pairsPlaceholder: "每行一项 NAME=value",
			secretHint: "值会作为只写密钥保存；已有值留空表示保持不变。",
			invalid: "请补全必填项，并按 NAME=value 填写每一项密钥。",
			save: "保存",
			saving: "保存中…"
		};
		//#endregion
		//#region lib/types/client/styles.js
		const STYLE_ID = "@dingyiliao/dsh-mcp-settings";
		const CSS = `
.dsh-mcp-section{display:flex;flex-direction:column;gap:12px;color:var(--dsw-alias-label-primary)}
.dsh-mcp-heading,.dsh-mcp-card-head,.dsh-mcp-identity,.dsh-mcp-actions,.dsh-mcp-editor-actions{display:flex;align-items:center;gap:8px}
.dsh-mcp-heading{justify-content:space-between;align-items:flex-start}.dsh-mcp-title{margin:0;font-size:15px;line-height:22px;font-weight:500}
.dsh-mcp-intro,.dsh-mcp-notice,.dsh-mcp-empty,.dsh-mcp-endpoint,.dsh-mcp-error{margin:0;font-size:12px;line-height:18px}
.dsh-mcp-intro,.dsh-mcp-empty,.dsh-mcp-endpoint,.dsh-mcp-notice{color:var(--dsw-alias-label-tertiary)}
.dsh-mcp-list{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}
.dsh-mcp-card{display:flex;flex-direction:column;gap:8px;padding:12px 14px;border:.5px solid var(--dsw-alias-border-l4);border-radius:14px}
.dsh-mcp-name{font-size:14px;line-height:22px;font-weight:500}.dsh-mcp-transport,.dsh-mcp-disabled{padding:1px 6px;border:.5px solid var(--dsw-alias-border-l3);border-radius:4px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px}
.dsh-mcp-disabled{color:var(--dsw-alias-label-tertiary)}.dsh-mcp-actions{margin-left:auto}.dsh-mcp-danger{color:var(--dsw-alias-state-error-primary)}
.dsh-mcp-editor,.dsh-mcp-add-editor{display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:12px;background:var(--dsw-alias-bg-module-platform)}
.dsh-mcp-add-editor{border:1px dashed var(--dsw-alias-border-l3)}.dsh-mcp-field{display:flex;flex-direction:column;gap:5px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dsh-mcp-field input,.dsh-mcp-field select,.dsh-mcp-field textarea{box-sizing:border-box;width:100%;border:.5px solid var(--dsw-alias-border-l4);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
.dsh-mcp-field input,.dsh-mcp-field select{height:34px;padding:0 10px}.dsh-mcp-field textarea{min-height:70px;padding:8px 10px;resize:vertical}
.dsh-mcp-field input:focus-visible,.dsh-mcp-field select:focus-visible,.dsh-mcp-field textarea:focus-visible{outline:none;border-color:var(--dsw-alias-brand-primary)}
.dsh-mcp-field small{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.dsh-mcp-check{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:12px}
.dsh-mcp-editor-actions{justify-content:flex-end}.dsh-mcp-error{color:var(--dsw-alias-state-error-primary)}
`;
		/** Install this bundle's styles for the Client plugin lifetime. */
		function installStyles(ctx) {
			ctx.effect(() => {
				if (document.querySelector(`style[data-plugin=${JSON.stringify(STYLE_ID)}]`) !== null) return () => {};
				const tag = document.createElement("style");
				tag.dataset.plugin = STYLE_ID;
				tag.textContent = CSS;
				document.head.appendChild(tag);
				return () => {
					tag.remove();
				};
			}, "mcp-settings: client styles");
		}
		//#endregion
		//#region lib/types/client/index.js
		/** Browser plugin contributing one MCP page to the existing Plugins settings section. */
		const NS = "settings.mcp";
		/** Required browser services. */
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.settings",
			"settingsScope"
		];
		/** Register localization, styles, and the feature-owned MCP tab. */
		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			const controller = new McpSettingsController(ctx, ctx.settingsScope.describe());
			ctx.effect(() => ctx.locale.register(NS, {
				en,
				zh
			}), "mcp-settings: dictionaries");
			ctx.effect(() => () => {
				controller.dispose();
			}, "mcp-settings: browser controller");
			installStyles(ctx);
			const injected = () => ({
				hooks: { mcpServers: controller },
				mutate: (ops, revision) => controller.mutate(ops, revision)
			});
			ctx.slots.inject("settings.plugins.tab", () => ctx.slots.register({
				name: "settings.plugins.tab",
				id: "mcp",
				order: 5,
				label: () => t("tab"),
				locale: NS,
				inject: injected
			}, McpServersTab));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map