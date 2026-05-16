import { useState, useCallback } from 'react';
import { sendChatMessage } from '../utils/api.js';
import initialLayout from '../data/initialLayout.json';

export function useLayoutAgent() {
  const [layout, setLayout] = useState(initialLayout);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hi! I\'m your layout agent. I can help you modify this design — try things like "Convert to 9:16", "Make the headline smaller", or "Move the product to the center".',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [lastModifiedNode, setLastModifiedNode] = useState(null);

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || loading) return;

      const userMsg = { role: 'user', content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        // Send last 6 messages for context (not including the one we just added)
        const history = messages.slice(-6);

        const data = await sendChatMessage(text.trim(), layout, history);

        if (data.updatedLayout) {
          setLayout(data.updatedLayout);
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.explanation || 'Done! The layout has been updated.',
          },
        ]);
      } catch (err) {
        console.error('Chat error:', err);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'Sorry, I had trouble processing that request. Please check that the server is running and try again.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [layout, messages, loading]
  );

  const resetLayout = useCallback(() => {
    setLayout(initialLayout);
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: 'Layout has been reset to the original design.' },
    ]);
  }, []);

  return { layout, messages, loading, sendMessage, resetLayout };
}
