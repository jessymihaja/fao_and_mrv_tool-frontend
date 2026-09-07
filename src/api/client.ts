// src/api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gcf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem('gcf_token');
      localStorage.removeItem('gcf_user');
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/adminlog';
      }
      return Promise.reject(error);
    }

    // 422 Unprocessable Content — extract Laravel validation errors
    // and attach a human-readable message to the error object
    if (status === 422) {
      const laravelErrors: Record<string, string[]> =
        error.response?.data?.errors ?? {};
      const firstMessages = Object.values(laravelErrors).flat();
      // Attach a `message` property so catch blocks can do: err.message
      error.message =
        firstMessages.length > 0
          ? firstMessages.join(' | ')
          : error.response?.data?.message ?? 'Données invalides (422)';
    }

    return Promise.reject(error);
  }
);

export default api;