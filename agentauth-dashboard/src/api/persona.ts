import { apiClient } from './client';
import type {
  PersonaResponse,
  PersonaVerifyResponse,
  PersonaHistoryResponse,
  PersonaUpdateResponse,
} from '../types/persona';

export interface RegisterPersonaRequest {
  version: string;
  personality?: Record<string, any>;
  constraints?: Record<string, any>;
  guardrails?: Record<string, any>;
  prompt_template?: string;
}

export const personaApi = {
  /**
   * Register a persona for an agent
   */
  async register(agentId: string, persona: RegisterPersonaRequest): Promise<PersonaResponse> {
    return apiClient.post<PersonaResponse>(`/agents/${agentId}/persona`, persona);
  },

  /**
   * Get persona for an agent
   */
  async get(agentId: string, includePrompt = false): Promise<PersonaResponse> {
    const params: Record<string, string> = {};
    if (includePrompt) params.includePrompt = 'true';
    return apiClient.get<PersonaResponse>(`/agents/${agentId}/persona`, params);
  },

  /**
   * Update persona for an agent
   */
  async update(agentId: string, persona: RegisterPersonaRequest): Promise<PersonaUpdateResponse> {
    return apiClient.put<PersonaUpdateResponse>(`/agents/${agentId}/persona`, persona);
  },

  /**
   * Verify persona integrity (HMAC check)
   */
  async verify(agentId: string): Promise<PersonaVerifyResponse> {
    return apiClient.post<PersonaVerifyResponse>(`/agents/${agentId}/persona/verify`);
  },

  /**
   * Get persona version history
   */
  async getHistory(
    agentId: string,
    params?: { limit?: number; offset?: number; sort?: string }
  ): Promise<PersonaHistoryResponse> {
    const queryParams: Record<string, string> = {
      limit: String(params?.limit || 10),
      offset: String(params?.offset || 0),
      sort: params?.sort || 'desc',
    };
    return apiClient.get<PersonaHistoryResponse>(
      `/agents/${agentId}/persona/history`,
      queryParams
    );
  },

  /**
   * Export persona as signed bundle
   */
  async exportBundle(agentId: string): Promise<Blob> {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/v1/agents/${agentId}/persona/export`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
      }
    );
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },

  /**
   * Import a signed persona bundle
   */
  async importBundle(
    agentId: string,
    bundle: Record<string, any>
  ): Promise<PersonaResponse> {
    return apiClient.post<PersonaResponse>(`/agents/${agentId}/persona/import`, bundle);
  },
};
