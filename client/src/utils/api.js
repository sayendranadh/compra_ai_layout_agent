import axios from 'axios';

// In dev, Vite proxy handles /api -> localhost:3001
// In production, set VITE_API_URL to your deployed backend URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function sendChatMessage(message, layout, history) {
  const { data } = await api.post('/chat', {
    message,
    layout,
    history,
  });
  return data;
}

export async function checkHealth() {
  const { data } = await api.get('/health');
  return data;
}
