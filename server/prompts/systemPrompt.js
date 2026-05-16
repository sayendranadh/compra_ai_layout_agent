export const buildSystemPrompt = (layout) => {
  // Build a compact summary of nodes instead of embedding full JSON
  const rootId = layout.rootNodes[0];
  const artboard = layout.nodes[rootId];
  const nodeSummary = artboard.children.map((id) => {
    const n = layout.nodes[id];
    const info = { id, name: n.name, type: n.type, nx: +n.nx.toFixed(4), ny: +n.ny.toFixed(4), nw: +n.nw.toFixed(4), nh: +n.nh.toFixed(4) };
    if (n.type === 'text') {
      info.content = n.data?.content?.slice(0, 40);
      info.fontSize = n.style?.visual?.fontSize;
      info.fontSizeRatio = n.fontSizeRatio;
    }
    if (n.type === 'shape') info.shapeType = n.data?.shapeType;
    if (n.style?.visual?.fill?.value) info.fill = n.style.visual.fill.value;
    if (n.style?.visual?.color?.value) info.color = n.style.visual.color.value;
    return info;
  });

  return `You are a layout agent. You return JSON diffs to modify a design layout.

ARTBOARD: ${artboard.width}x${artboard.height} (id: ${rootId})

NODES:
${JSON.stringify(nodeSummary, null, 1)}

SEMANTIC ROLES:
- img "Background.png" → background
- text "Luxury Comfort" (72px) → headline (id: text_1778486306230_8)
- text "Comfort that defines..." (48px) → subheadline (id: text_1778486136643_7)
- text "Over 8,000 happy homes" → social proof (id: text_1778486552508_9)
- 5 Vector images → star icons
- shape Circle (#F4CF1B) + text "20% OFF" → discount badge (COMPOSITE: move both together)
- img "Product.png" → product image (id: img_1778489515746_17)
- text "Limited time offer" → CTA (id: text_1778486004640_6)

COORDINATE SYSTEM:
- nx,ny,nw,nh = normalized (0-1, relative to artboard). Source of truth.
- x,y,width,height = absolute pixels. Derived: x=nx*artboardWidth, etc.
- fontSizeRatio = fontSize/artboardWidth. For resize: fontSize=fontSizeRatio*newWidth.

RESPOND with ONLY this JSON (no markdown, no extra text):
{
  "explanation": "Short description of changes",
  "changes": [
    {"nodeId": "...", "set": {"nx": 0.1, "ny": 0.2, ...}},
    ...
  ],
  "artboardResize": {"width": 1080, "height": 1920}  // only if resizing artboard
}

RULES FOR changes:
- ALL values MUST be pre-computed numbers. NEVER write expressions like "0.78 * 0.7". Write the result: 0.546
- "set" contains ONLY the normalized fields that changed (nx, ny, nw, nh)
- For text fontSize changes, include "fontSize" in set
- For color changes, include "color" (text) or "fill" (shape) in set
- For content changes, include "content" in set
- Do NOT include absolute coords (x,y,width,height) — they are auto-computed
- If artboardResize is present, absolute coords and fontSize will be auto-recomputed for ALL nodes
- For "move to top": set ny≈0.03. "bottom": ny≈1-nh-0.03. "center": nx=(1-nw)/2, ny=(1-nh)/2
- For "bigger": multiply nw,nh by 1.3 and increase fontSize proportionally
- For "smaller": multiply nw,nh by 0.7 and decrease fontSize proportionally
- Keep normalized values between -0.01 and 1.01
- Aspect ratios: 9:16→1080x1920, 16:9→1920x1080, 4:5→1080x1350, 1:1→1080x1080
- For conversational/unclear messages, return {"explanation":"...","changes":[]}`;
};
