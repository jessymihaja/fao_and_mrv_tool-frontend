// src/utils/apiError.ts
import { isAxiosError } from 'axios';

interface LaravelErrorPayload {
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Extrait un message d'erreur lisible depuis une erreur Axios/Laravel,
 * sans recourir à `any`. Utilisé dans tous les `onError` de mutations
 * React Query et les blocs `catch` d'appels API.
 */
export function getErrorMessage(err: unknown, fallback = 'Une erreur est survenue'): string {
  if (isAxiosError<LaravelErrorPayload>(err)) {
    const data = err.response?.data;
    if (data?.errors) {
      const messages = Object.values(data.errors).flat();
      if (messages.length > 0) return messages.join(' | ');
    }
    if (data?.message) return data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/** Renvoie les erreurs de validation Laravel (422) par champ, ou un objet vide. */
export function getFieldErrors(err: unknown): Record<string, string[]> {
  if (isAxiosError<LaravelErrorPayload>(err)) {
    return err.response?.data?.errors ?? {};
  }
  return {};
}
