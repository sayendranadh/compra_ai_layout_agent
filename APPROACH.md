# Design Approach

## 1. System Prompt Architecture

The system prompt is the most critical piece of this project — 80% of agent quality comes from prompt design.

### Compact Node Summary (not raw JSON)

The initial approach embedded the entire layout JSON (~3,000 tokens) in the system prompt and asked the LLM to return the complete modified JSON. This failed for two reasons: the response exceeded token limits on budget-friendly models, and LLMs make arithmetic errors when manipulating coordinate values in large JSON structures.

The final approach sends a **compact summary** of each node (id, name, type, normalized coordinates, and key properties like fontSize or fill color) — roughly 500 tokens instead of 3,000. The LLM only needs to identify which node to modify and what to change, not reproduce the entire document.

### Semantic Role Mapping

The prompt explicitly maps node names and content to human-readable roles:

```
- text "Luxury Comfort" (72px) → headline (id: text_1778486306230_8)
- shape Circle (#F4CF1B) + text "20% OFF" → discount badge (COMPOSITE: move both)
- img "Product.png" → product image
```

This bridges the gap between a user saying "the headline" and the actual node ID `text_1778486306230_8`. Without this mapping, the LLM would have to infer roles from context — sometimes correctly, sometimes not.

### Diff-Based Output Format

Instead of returning the complete layout JSON, the LLM returns a minimal diff:

```json
{
  "explanation": "Moved the headline to the top of the canvas",
  "changes": [
    { "nodeId": "text_1778486306230_8", "set": { "ny": 0.03 } }
  ]
}
```

The server then applies these changes deterministically to the full layout. This approach has three benefits:
1. **Token efficiency** — responses are typically 50–200 tokens instead of 3,000+
2. **Reliability** — the LLM only decides *what* to change, not *how* to compute coordinates
3. **Validation** — it's trivial to verify that a diff has valid node IDs and reasonable values

---

## 2. Safe JSON Transformation

### The Trust Problem

LLM output cannot be trusted as valid JSON. In testing across multiple models, common failure modes included:

- **Math expressions instead of values**: Llama 3.1 would write `"nw": 0.78 * 0.7` instead of `"nw": 0.546` — valid arithmetic but invalid JSON
- **Truncated output**: Models hitting token limits produce incomplete JSON
- **Markdown wrapping**: Models wrap JSON in ` ```json ``` ` code fences despite instructions not to
- **Extra commentary**: Some models add explanatory text before or after the JSON

### Multi-Layer Recovery

The parsing pipeline handles each failure mode in sequence:

```
Raw LLM text
  → Strip markdown fences (```json ... ```)
  → Evaluate inline math expressions (0.78 * 0.7 → 0.546)
  → Resolve Math.round() calls
  → JSON.parse()
  → If parse fails: extract "explanation" via regex, return layout unchanged
```

The user never sees a broken state. If parsing fails entirely, they get a message like "I understood your request but could not generate a valid response" and the layout remains unchanged.

### Deterministic Application

The `applyDiff()` function in `routes/chat.js` applies changes to a deep clone of the layout:

1. If `artboardResize` is present, update artboard dimensions and recompute ALL children's absolute coordinates from their normalized values. Font sizes are rescaled using `fontSizeRatio × newWidth`.
2. For each entry in `changes`, apply the specified fields to the target node.
3. After applying normalized coordinate changes, recompute absolute coordinates: `x = nx × artboardWidth`, etc.
4. For color/fill/content changes, update the appropriate nested style fields.

The server also has deterministic transform helpers (`resizeArtboard`, `moveNode`, `resizeNode`, `moveNodeGroup`) in `layoutTransforms.js` that can be called directly for operations that don't need LLM reasoning.

---

## 3. Conversation Context

The agent maintains a sliding window of the last 6 messages (3 user + 3 assistant exchanges) and sends them with each request. This enables follow-up resolution:

> **User**: "Make the headline smaller"
> **Assistant**: "Reduced the headline font from 72px to 50px."
> **User**: "Make it even smaller"

The LLM sees the prior exchange and resolves "it" to "the headline." Without context, the second message is ambiguous.

### Why 6 messages, not more?

- **Token budget**: Each message consumes tokens from the already-constrained context window. On Groq's free tier with Llama 3.1 8B, the system prompt + 6 history messages + layout summary fits comfortably under limits. More history would risk truncation.
- **Relevance decay**: Messages from 10+ turns ago rarely matter. The user isn't referring to something they said 15 minutes ago — they're reacting to the last change.
- **Cost control**: On paid APIs (Anthropic, OpenRouter), more context = more money per request.

---

## 4. Trade-Offs and Future Improvements

### Trade-Offs Made

**Diff-based vs. full-layout responses**
The diff approach trades flexibility for reliability. The LLM can't make creative multi-step changes in a single response (e.g., "reorganize everything for a story layout") because it can only express changes to known fields. A full-layout approach would allow more creative transformations but would require a larger, more expensive model to produce valid JSON consistently.

**8B model vs. 70B model**
Llama 3.1 8B is fast and free but occasionally misidentifies nodes or produces invalid diffs. The 70B model is significantly more accurate but consumes 4× more tokens, hitting Groq's daily free limit after ~40 requests. For a demo/portfolio project, reliability of access (free tier) was prioritized over reliability of reasoning.

**Wireframe vs. rendered preview**
The wireframe shows node positions, sizes, and labels but doesn't render actual images or typography. A rendered preview (using the Cloudinary image URLs and actual fonts) would be more visually compelling but adds significant complexity — CORS handling for cross-origin images, font loading, and z-index management for overlapping elements.

**Client-side state vs. server-side state**
All layout state lives in the React client (via `useState`). The server is stateless — each request includes the current layout. This simplifies deployment (no database, no sessions) but means refreshing the page resets everything.

### What I'd Improve With More Time

1. **Undo/redo stack** — Store layout snapshots on each change so users can step backwards. Currently, the only way to revert is the full reset button.

2. **Rendered preview** — Load actual images from Cloudinary URLs and render text with proper fonts, sizes, and colors. The wireframe is functional but doesn't show the design as a user would see it.

3. **Streaming responses** — Use server-sent events to stream the LLM explanation while it generates, then apply the diff when complete. Currently the user stares at a loading indicator for 1–4 seconds.

4. **Model router** — Automatically select the model based on request complexity. Simple moves → 8B model (fast, cheap). Aspect ratio conversions → 70B model (better reasoning). This would optimize the cost/quality balance dynamically.

5. **Batch operations** — Support multi-step commands like "Convert to 9:16 and move the headline to the top and make the badge bigger." Currently, each must be a separate message.

6. **Persistent state** — Save layout versions to a database so users can share links to specific versions, or return to a session after closing the browser.

7. **Visual diff indicator** — Highlight which nodes changed after each command (e.g., flash the modified element in the wireframe) so the user can immediately see what moved.
