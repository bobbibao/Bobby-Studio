import { create } from 'zustand';
import { auth } from '@/configs/firebase';
import { clearToken, getToken } from './tokenStorage';
import { authService } from './auth.service';

interface AuthStore {
  user: unknown | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: unknown | null) => void;
  verifyAuth: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),

  verifyAuth: async () => {
    set({ isLoading: true, error: null });

    try {
      const token = await getToken();

      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const user = await authService.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      clearToken();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  },

  logout: async () => {
    try {
      await auth.signOut();
    } finally {
      clearToken();
      set({ user: null, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));

