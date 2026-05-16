import { Router } from 'express';
import { buildSystemPrompt } from '../prompts/systemPrompt.js';
import { callLLM } from '../services/llmService.js';

const router = Router();

/**
 * Apply a diff-based LLM response to the current layout.
 * The LLM returns { explanation, changes, artboardResize? }
 * We apply changes to a deep clone of the layout.
 */
function applyDiff(layout, diff) {
  const updated = JSON.parse(JSON.stringify(layout));
  const rootId = updated.rootNodes[0];
  const artboard = updated.nodes[rootId];

  // Step 1: Resize artboard if requested
  if (diff.artboardResize) {
    const { width, height } = diff.artboardResize;
    artboard.width = width;
    artboard.height = height;

    // Recompute ALL children absolute coords from normalized
    for (const childId of artboard.children) {
      const node = updated.nodes[childId];
      if (!node) continue;
      node.x = node.nx * width;
      node.y = node.ny * height;
      node.width = node.nw * width;
      node.height = node.nh * height;

      // Rescale font size using fontSizeRatio
      if (node.type === 'text' && node.fontSizeRatio) {
        node.style.visual.fontSize = Math.round(node.fontSizeRatio * width);
      }
    }
  }

  // Step 2: Apply per-node changes
  if (Array.isArray(diff.changes)) {
    for (const change of diff.changes) {
      const node = updated.nodes[change.nodeId];
      if (!node) {
        console.warn(`Node not found: ${change.nodeId}`);
        continue;
      }

      const s = change.set || {};

      // Apply normalized coord changes
      if (s.nx !== undefined) node.nx = s.nx;
      if (s.ny !== undefined) node.ny = s.ny;
      if (s.nw !== undefined) node.nw = s.nw;
      if (s.nh !== undefined) node.nh = s.nh;

      // Recompute absolute from normalized
      node.x = node.nx * artboard.width;
      node.y = node.ny * artboard.height;
      node.width = node.nw * artboard.width;
      node.height = node.nh * artboard.height;

      // Apply fontSize change
      if (s.fontSize !== undefined && node.type === 'text') {
        node.style.visual.fontSize = s.fontSize;
        node.fontSizeRatio = s.fontSize / artboard.width;
      }

      // Apply color change (text)
      if (s.color !== undefined && node.style?.visual?.color) {
        node.style.visual.color.value = s.color;
      }

      // Apply fill change (shape)
      if (s.fill !== undefined && node.style?.visual?.fill) {
        node.style.visual.fill.value = s.fill;
      }
      // Also update stroke to match for shapes
      if (s.fill !== undefined && node.style?.visual?.stroke) {
        node.style.visual.stroke.value = s.fill;
      }

      // Apply content change (text)
      if (s.content !== undefined && node.data) {
        node.data.content = s.content;
      }
    }
  }

  return updated;
}

router.post('/', async (req, res) => {
  try {
    const { message, layout, history = [] } = req.body;

    if (!message || !layout) {
      return res.status(400).json({
        error: 'Missing required fields: message and layout',
      });
    }

    const systemPrompt = buildSystemPrompt(layout);
    const recentHistory = history.slice(-6);
    const llmResponse = await callLLM(systemPrompt, recentHistory, message);

    // Handle truncated response (LLM ran out of tokens)
    if (llmResponse._truncated) {
      return res.json({
        updatedLayout: layout,
        explanation: llmResponse.explanation,
      });
    }

    // Apply the diff to get the updated layout
    try {
      const updatedLayout = applyDiff(layout, llmResponse);
      return res.json({
        updatedLayout,
        explanation: llmResponse.explanation || 'Done!',
      });
    } catch (applyError) {
      console.error('Error applying diff:', applyError.message);
      return res.json({
        updatedLayout: layout,
        explanation: `I understood your request but had trouble applying the changes: ${applyError.message}`,
      });
    }
  } catch (error) {
    console.error('Chat endpoint error:', error);
    return res.status(500).json({
      updatedLayout: req.body?.layout || null,
      explanation: 'Something went wrong processing your request. Please try again.',
      error: error.message,
    });
  }
});

export default router;
