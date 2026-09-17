const STYLE_ID = '@dingyiliao/dsh-mcp-settings';
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
export function installStyles(ctx) {
    ctx.effect(() => {
        const existing = document.querySelector(`style[data-plugin=${JSON.stringify(STYLE_ID)}]`);
        if (existing !== null)
            return () => { };
        const tag = document.createElement('style');
        tag.dataset.plugin = STYLE_ID;
        tag.textContent = CSS;
        document.head.appendChild(tag);
        return () => { tag.remove(); };
    }, 'mcp-settings: client styles');
}
//# sourceMappingURL=styles.js.map