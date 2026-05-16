/**
 * Deep clone a layout to avoid mutating the original.
 */
function cloneLayout(layout) {
  return JSON.parse(JSON.stringify(layout));
}

/**
 * Get the artboard node from the layout.
 */
function getArtboard(layout) {
  const rootId = layout.rootNodes[0];
  return layout.nodes[rootId];
}

/**
 * Resize the artboard and recompute all children from normalized coordinates.
 * Handles aspect ratio conversions like "Convert to 9:16".
 */
export function resizeArtboard(layout, newWidth, newHeight) {
  const updated = cloneLayout(layout);
  const artboard = getArtboard(updated);

  artboard.width = newWidth;
  artboard.height = newHeight;

  // Update artboard preset name based on common ratios
  const ratio = `${newWidth}:${newHeight}`;
  const presetMap = {
    '1080:1080': 'instagram-post',
    '1080:1920': 'instagram-story',
    '1920:1080': 'youtube-thumbnail',
    '1080:1350': 'instagram-portrait',
  };
  if (presetMap[ratio]) {
    artboard.data.preset = presetMap[ratio];
  }

  // Recompute every child from normalized coordinates
  if (artboard.children) {
    artboard.children.forEach((childId) => {
      const node = updated.nodes[childId];
      if (!node) return;

      node.x = node.nx * newWidth;
      node.y = node.ny * newHeight;
      node.width = node.nw * newWidth;
      node.height = node.nh * newHeight;

      // Scale font size proportionally using fontSizeRatio if available
      if (node.type === 'text' && node.fontSizeRatio) {
        node.style.visual.fontSize = Math.round(node.fontSizeRatio * newWidth);
      }
    });
  }

  return updated;
}

/**
 * Move a node to a semantic position.
 * Positions: "top", "bottom", "center", "left", "right"
 */
export function moveNode(layout, nodeId, position) {
  const updated = cloneLayout(layout);
  const artboard = getArtboard(updated);
  const node = updated.nodes[nodeId];

  if (!node) throw new Error(`Node not found: ${nodeId}`);

  const margin = 0.03; // 3% margin from edges

  switch (position) {
    case 'top':
      node.ny = margin;
      break;
    case 'bottom':
      node.ny = 1 - node.nh - margin;
      break;
    case 'left':
      node.nx = margin;
      break;
    case 'right':
      node.nx = 1 - node.nw - margin;
      break;
    case 'center':
      node.nx = (1 - node.nw) / 2;
      node.ny = (1 - node.nh) / 2;
      break;
    case 'center-horizontal':
      node.nx = (1 - node.nw) / 2;
      break;
    case 'center-vertical':
      node.ny = (1 - node.nh) / 2;
      break;
    default:
      throw new Error(`Unknown position: ${position}`);
  }

  // Recompute absolute from normalized
  node.x = node.nx * artboard.width;
  node.y = node.ny * artboard.height;

  return updated;
}

/**
 * Resize a node by a scale factor, keeping it centered at its position.
 */
export function resizeNode(layout, nodeId, scale) {
  const updated = cloneLayout(layout);
  const artboard = getArtboard(updated);
  const node = updated.nodes[nodeId];

  if (!node) throw new Error(`Node not found: ${nodeId}`);

  // Calculate center point
  const centerNx = node.nx + node.nw / 2;
  const centerNy = node.ny + node.nh / 2;

  // Apply scale
  node.nw *= scale;
  node.nh *= scale;

  // Reposition to keep centered
  node.nx = centerNx - node.nw / 2;
  node.ny = centerNy - node.nh / 2;

  // Recompute absolute values
  node.x = node.nx * artboard.width;
  node.y = node.ny * artboard.height;
  node.width = node.nw * artboard.width;
  node.height = node.nh * artboard.height;

  // Scale font size for text nodes
  if (node.type === 'text' && node.style?.visual?.fontSize) {
    node.style.visual.fontSize = Math.round(node.style.visual.fontSize * scale);
    // Update fontSizeRatio
    node.fontSizeRatio = node.style.visual.fontSize / artboard.width;
  }

  return updated;
}

/**
 * Move a group of nodes (e.g., the discount badge = circle + text).
 * Moves all nodes by the same delta.
 */
export function moveNodeGroup(layout, nodeIds, deltaX, deltaY) {
  const updated = cloneLayout(layout);
  const artboard = getArtboard(updated);

  nodeIds.forEach((nodeId) => {
    const node = updated.nodes[nodeId];
    if (!node) return;

    node.nx += deltaX;
    node.ny += deltaY;
    node.x = node.nx * artboard.width;
    node.y = node.ny * artboard.height;
  });

  return updated;
}
