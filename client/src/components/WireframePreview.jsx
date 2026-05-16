import { useMemo } from 'react';

const TYPE_COLORS = {
  image: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.5)', label: '#60a5fa' },
  text: { bg: 'rgba(167, 139, 250, 0.08)', border: 'rgba(167, 139, 250, 0.35)', label: '#a78bfa' },
  shape: { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.5)', label: '#fbbf24' },
};

function getNodeLabel(node) {
  if (node.type === 'text') return node.data?.content?.slice(0, 30) || 'Text';
  if (node.name) return node.name;
  return node.type;
}

/** Normalize shorthand hex like "#FFFF" to a valid CSS color */
function normalizeColor(val) {
  if (!val) return null;
  // "#FFFF" → "#FFFFFF"
  if (/^#[0-9a-fA-F]{4}$/.test(val)) return val.slice(0, 4);
  // "#FFF" is valid CSS
  return val;
}

function getTextColor(node) {
  const raw = node.style?.visual?.color?.value;
  if (!raw) return null;
  // Ignore white/near-white — these are the default and won't show on dark wireframe
  const upper = raw.toUpperCase();
  if (upper === '#FFFF' || upper === '#FFF' || upper === '#FFFFFF' || upper === '#FFFFFFFF') return null;
  return normalizeColor(raw);
}

export default function WireframePreview({ layout }) {
  const artboard = useMemo(() => {
    const rootId = layout.rootNodes?.[0];
    return rootId ? layout.nodes?.[rootId] : null;
  }, [layout]);

  const children = useMemo(() => {
    if (!artboard?.children) return [];
    return artboard.children
      .map((id) => layout.nodes[id])
      .filter(Boolean)
      .filter((n) => n.type !== 'image' || n.name !== 'Background.png');
  }, [layout, artboard]);

  if (!artboard) return <div className="text-slate-500 text-sm">No artboard found</div>;

  const aspect = artboard.width / artboard.height;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Preview</span>
          <span className="text-xs text-slate-500">
            {artboard.name} — {artboard.width}×{artboard.height}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: TYPE_COLORS.image.border }} />
            Image
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: TYPE_COLORS.text.border }} />
            Text
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: TYPE_COLORS.shape.border }} />
            Shape
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div
          className="relative border border-slate-600/30 rounded-lg overflow-hidden shadow-2xl"
          style={{
            aspectRatio: `${artboard.width} / ${artboard.height}`,
            width: aspect >= 1 ? '100%' : 'auto',
            height: aspect < 1 ? '100%' : 'auto',
            maxWidth: '100%',
            maxHeight: '100%',
            backgroundColor: '#1e293b',
          }}
        >
          {children.map((node) => {
            const colors = TYPE_COLORS[node.type] || TYPE_COLORS.image;
            const isCircle = node.type === 'shape' && node.data?.shapeType === 'circle';
            const isText = node.type === 'text';

            // Actual fill for shapes
            const shapeFill =
              node.type === 'shape' && node.style?.visual?.fill?.value
                ? node.style.visual.fill.value
                : null;

            // Actual text color
            const textColor = isText ? getTextColor(node) : null;

            // Relative font size for display (scale down proportionally)
            const fontSize = node.style?.visual?.fontSize;
            const fontWeight = node.style?.visual?.fontWeight;
            const fontStyle = node.style?.visual?.fontStyle;

            return (
              <div
                key={node.id}
                className="absolute flex items-center justify-center transition-all duration-500"
                style={{
                  left: `${node.nx * 100}%`,
                  top: `${node.ny * 100}%`,
                  width: `${node.nw * 100}%`,
                  height: `${node.nh * 100}%`,
                  backgroundColor: shapeFill || (isText ? 'transparent' : colors.bg),
                  border: shapeFill ? 'none' : `1px solid ${colors.border}`,
                  borderRadius: isCircle ? '50%' : '3px',
                  overflow: 'hidden',
                }}
                title={`${node.name || node.id}\n${Math.round(node.width)}×${Math.round(node.height)}${fontSize ? `\nFont: ${fontSize}px` : ''}`}
              >
                <span
                  className="text-center px-1 leading-tight"
                  style={{
                    color: textColor || colors.label,
                    fontSize: isText
                      ? `clamp(5px, ${(node.nh * 100) / 2.5}vw, ${Math.min(fontSize || 14, 18)}px)`
                      : 'clamp(6px, 1.2vw, 11px)',
                    fontWeight: fontWeight || 500,
                    fontStyle: fontStyle || 'normal',
                    lineHeight: 1.2,
                    opacity: 0.95,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                >
                  {getNodeLabel(node)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
