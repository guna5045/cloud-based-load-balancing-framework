export const env = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  wsUrl: import.meta.env.VITE_WS_URL || 'http://localhost:5000',
  appTitle: import.meta.env.VITE_APP_TITLE || 'Cloud-Based Load Balancing Framework',
};
