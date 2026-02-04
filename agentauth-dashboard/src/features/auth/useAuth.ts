import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../../api/client';
import type { VerifyResponse } from '../../types/common';

interface AgentInfo {
  agent_id: string;
  name: string;
  permissions: string[];
  tier: string;
}

interface AuthState {
  // State
  agent: AgentInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (agentId: string, apiKey: string) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      agent: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login action
      login: async (agentId: string, apiKey: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/v1/agents/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ agent_id: agentId, api_key: apiKey }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || error.error || 'Authentication failed');
          }

          const data: VerifyResponse = await response.json();

          // Check if agent has admin permission
          if (!data.agent.permissions?.includes('*:*:*')) {
            throw new Error('Admin permission (*:*:*) required to access dashboard');
          }

          set({
            agent: data.agent,
            accessToken: data.token.access_token,
            refreshToken: data.token.refresh_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },

      // Logout action
      logout: () => {
        set({
          agent: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // Set tokens (used by API client on refresh)
      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'agentauth-storage',
      partialize: (state) => ({
        agent: state.agent,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize API client with auth handlers
apiClient.initialize({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (accessToken, refreshToken) => {
    useAuthStore.getState().setTokens(accessToken, refreshToken);
  },
  onUnauthorized: () => {
    useAuthStore.getState().logout();
  },
});

// Helper hook for easier access
export function useAuth() {
  return useAuthStore();
}
