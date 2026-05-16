/**
 * Validate the structure of a layout returned by the LLM.
 * Throws descriptive errors if the layout is malformed.
 */
export function validateLayout(layout) {
  if (!layout || typeof layout !== 'object') {
    throw new Error('Layout must be a non-null object');
  }

  if (!Array.isArray(layout.rootNodes) || layout.rootNodes.length === 0) {
    throw new Error('rootNodes must be a non-empty array');
  }

  if (!layout.nodes || typeof layout.nodes !== 'object') {
    throw new Error('nodes must be an object');
  }

  // Check all root nodes exist
  for (const id of layout.rootNodes) {
    if (!layout.nodes[id]) {
      throw new Error(`Missing root node: ${id}`);
    }
  }

  // Check artboard has children
  const artboard = layout.nodes[layout.rootNodes[0]];
  if (!Array.isArray(artboard.children)) {
    throw new Error('Artboard must have a children array');
  }

  // Check all children exist and have required fields
  for (const childId of artboard.children) {
    const node = layout.nodes[childId];
    if (!node) {
      throw new Error(`Missing child node: ${childId}`);
    }

    // Check required coordinate fields exist
    const requiredFields = ['x', 'y', 'width', 'height', 'nx', 'ny', 'nw', 'nh', 'type'];
    for (const field of requiredFields) {
      if (node[field] === undefined || node[field] === null) {
        throw new Error(`Node ${childId} missing required field: ${field}`);
      }
    }

    // Check type is valid
    const validTypes = ['image', 'text', 'shape', 'artboard'];
    if (!validTypes.includes(node.type)) {
      throw new Error(`Node ${childId} has invalid type: ${node.type}`);
    }
  }

  return true;
}

/**
 * Validate the complete LLM response shape.
 */
export function validateLLMResponse(response) {
  if (!response || typeof response !== 'object') {
    throw new Error('LLM response must be an object');
  }

  if (typeof response.explanation !== 'string') {
    throw new Error('LLM response must include an "explanation" string');
  }

  if (!response.updatedLayout) {
    throw new Error('LLM response must include "updatedLayout"');
  }

  validateLayout(response.updatedLayout);
  return true;
}
