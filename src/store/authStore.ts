// src/store/authStore.ts
import { create } from 'zustand';
import type { User } from '@/types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

const stored = localStorage.getItem('gcf_user');
const storedToken = localStorage.getItem('gcf_token');

export const useAuthStore = create<AuthStore>((set) => ({
  user: stored ? JSON.parse(stored) : null,
  token: storedToken || null,
  isAuthenticated: !!storedToken,

  setAuth: (user, token) => {
    localStorage.setItem('gcf_token', token);
    localStorage.setItem('gcf_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem('gcf_token');
    localStorage.removeItem('gcf_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (partial) =>
    set((state) => {
      const updated = { ...state.user!, ...partial };
      localStorage.setItem('gcf_user', JSON.stringify(updated));
      return { user: updated };
    }),
}));
