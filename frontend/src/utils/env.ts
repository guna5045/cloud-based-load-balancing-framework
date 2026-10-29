const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const rawWsUrl = (import.meta.env.VITE_WS_URL || '').trim().replace(/\/+$/, '');

export const env = {
  apiUrl: rawApiUrl || 'http://localhost:5000',
  wsUrl: rawWsUrl || rawApiUrl || 'http://localhost:5000',
  appTitle: import.meta.env.VITE_APP_TITLE || 'Cloud-Based Load Balancing Framework',
};
