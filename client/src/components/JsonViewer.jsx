import { useState, useMemo } from 'react';

function syntaxHighlight(json) {
  const str = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'json-key' : 'json-string';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

export default function JsonViewer({ layout }) {
  const [collapsed, setCollapsed] = useState(false);

  const artboard = useMemo(() => {
    const rootId = layout.rootNodes?.[0];
    if (!rootId) return null;
    const ab = layout.nodes?.[rootId];
    return ab ? { width: ab.width, height: ab.height, name: ab.name, preset: ab.data?.preset } : null;
  }, [layout]);

  const highlighted = useMemo(() => syntaxHighlight(layout), [layout]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">JSON</span>
          {artboard && (
            <span className="text-xs text-slate-500">
              {artboard.width}×{artboard.height}
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-xs text-slate-500 hover:text-slate-300 transition"
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="flex-1 overflow-auto p-3">
          <pre
            className="json-viewer whitespace-pre-wrap break-all"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </div>
      )}
    </div>
  );
}
