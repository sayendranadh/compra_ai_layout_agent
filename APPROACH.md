# Design Approach

## Core Architecture Decision: Hybrid LLM + Deterministic

The fundamental choice is splitting work between the LLM and code:

- **LLM handles reasoning**: "which element is the headline?", "what does 'move it up' mean?", "the user said 'make the badge red' — which nodes form the badge?"
- **Code handles math**: coordinate transformations, normalized ↔ absolute conversions, aspect ratio reflows

This avoids the biggest failure mode of pure-LLM approaches: arithmetic errors in coordinate calculations. An LLM asked to compute `0.3503396592170152 × 1920` will sometimes hallucinate. A deterministic function won't.

## System Prompt Design

The system prompt is the agent's brain. Key decisions:

1. **Semantic role mapping**: The prompt explicitly maps node names/content to semantic roles ("Background.png" → background, "Luxury Comfort" → headline). This bridges the gap between human language ("the headline") and JSON node IDs.

2. **Composite element awareness**: The yellow circle and "20% OFF" text form a visual badge. The prompt tells the LLM to move them together.

3. **Transformation rules as recipes**: Rather than hoping the LLM invents the right math, the prompt provides step-by-step transformation recipes (e.g., for aspect ratio conversion: change dimensions → recompute children → update fonts).

4. **Strict output format**: The LLM returns JSON with `explanation` + `updatedLayout`. No markdown fences, no extra text. This makes parsing reliable.

## Coordinate System

The dual coordinate system (absolute + normalized) is the layout's most important feature:

- **Normalized (0–1)** is the source of truth. A headline at `nx=0.12, ny=0.16` means "12% from left, 16% from top" regardless of canvas size.
- **Absolute (pixels)** is derived: `x = nx × artboard_width`. It exists for compatibility with rendering engines that expect pixel values.

When the artboard resizes (e.g., 1:1 → 9:16), we keep normalized values unchanged and recompute absolute values. This preserves relative positioning automatically.

## Conversation Context

The agent sends the last 6 messages (3 user + 3 assistant exchanges) to the LLM. This enables follow-ups:

> User: "Make the headline smaller"
> Assistant: "I reduced the headline font from 72px to 54px."
> User: "Actually, make it even smaller"

The LLM sees the prior exchange and knows "it" = "the headline". Without context, the second message is ambiguous.

We limit to 6 messages to balance context quality against token cost. Older messages are less likely to be referenced and would dilute the prompt.

## Wireframe Preview

The preview uses CSS positioning with normalized coordinates directly as percentages. Each node becomes an absolutely-positioned div:

```css
left: ${nx * 100}%
top: ${ny * 100}%
width: ${nw * 100}%
height: ${nh * 100}%
```

The container maintains aspect ratio using the CSS `aspect-ratio` property, fitting within the available space. Nodes are color-coded by type (blue=image, purple=text, yellow=shape) with labels showing content or name.

## Validation Strategy

Every LLM response goes through validation before being applied:

1. Check response has `explanation` (string) and `updatedLayout` (object)
2. Verify layout has `rootNodes` and `nodes`
3. Verify artboard has `children` array
4. Verify all children exist and have required coordinate fields
5. Verify node types are valid

If validation fails, the original layout is returned unchanged with an error message. The user never sees a broken state.

## Error Handling Philosophy

- **Never crash**: Every error is caught and produces a graceful fallback
- **Preserve state**: On any failure, return the original layout unchanged
- **Explain failures**: Tell the user what went wrong and suggest rephrasing
- **Timeout protection**: 60-second timeout on LLM calls (they can be slow for large JSON)
