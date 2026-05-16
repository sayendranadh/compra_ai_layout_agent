export async function callLLM(systemPrompt, history, userMessage) {
  const messages = [
    ...history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 1024,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    // Parse retry delay from rate limit errors
    if (response.status === 429) {
      const retryMatch = err.match(/try again in ([\d.]+s)/);
      const wait = retryMatch ? retryMatch[1] : 'a minute';
      throw new Error(`Rate limited — please wait ${wait} and try again.`);
    }
    throw new Error(`Groq API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;

  // Strip markdown code fences if present
  let cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Fix: LLMs sometimes write math expressions instead of computed values
  // e.g. "0.7816 * 0.7" instead of 0.54712
  // Replace patterns like: number * number or number / number with eval'd result
  cleaned = cleaned.replace(
    /:\s*([\d.]+)\s*\*\s*([\d.]+)/g,
    (_, a, b) => `: ${+(parseFloat(a) * parseFloat(b)).toFixed(6)}`
  );
  cleaned = cleaned.replace(
    /:\s*([\d.]+)\s*\/\s*([\d.]+)/g,
    (_, a, b) => `: ${+(parseFloat(a) / parseFloat(b)).toFixed(6)}`
  );
  // Also handle Math.round(...) patterns
  cleaned = cleaned.replace(
    /Math\.round\(([\d.]+)\s*\*\s*([\d.]+)\)/g,
    (_, a, b) => `${Math.round(parseFloat(a) * parseFloat(b))}`
  );

  // Try to parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.log('JSON parse failed after cleanup, attempting recovery...');
    console.log('Cleaned response:', cleaned.slice(0, 400));
  }

  // Fallback: extract just the explanation
  const explanationMatch = cleaned.match(/"explanation"\s*:\s*"([^"]+)"/);
  const explanation = explanationMatch
    ? explanationMatch[1]
    : 'I understood your request but could not generate a valid response. Try rephrasing.';

  return {
    explanation,
    updatedLayout: null,
    _truncated: true,
  };
}
