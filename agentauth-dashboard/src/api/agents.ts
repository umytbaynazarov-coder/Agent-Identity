import { apiClient } from './client';
import type {
  Agent,
  AgentFilters,
  PaginationParams,
  VerificationLog,
} from '../types/agent';

export interface ListAgentsResponse {
  agents: Agent[];
}

export interface GetAgentResponse {
  agent: Agent;
}

export interface GetActivityResponse {
  activity: VerificationLog[];
  pagination: {
    offset: number;
    limit: number;
    count: number;
    total: number;
    has_more: boolean;
  };
}

export interface UpdateTierRequest {
  tier: 'free' | 'pro' | 'enterprise';
}

export interface UpdatePermissionsRequest {
  permissions: string[];
}

export interface UpdatePermissionsResponse {
  success: boolean;
  message: string;
  agent: Agent;
}

export const agentsApi = {
  /**
   * List all agents (admin only)
   */
  async list(filters?: AgentFilters): Promise<Agent[]> {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.search) params.search = filters.search;
    if (filters?.tier) params.tier = filters.tier;

    const response = await apiClient.get<ListAgentsResponse>('/agents', params);
    return response.agents;
  },

  /**
   * Get agent details by ID
   */
  async get(agentId: string): Promise<Agent> {
    const response = await apiClient.get<GetAgentResponse>(`/agents/${agentId}`);
    return response.agent;
  },

  /**
   * Revoke an agent
   */
  async revoke(agentId: string): Promise<void> {
    await apiClient.post(`/agents/${agentId}/revoke`);
  },

  /**
   * Get agent activity logs
   */
  async getActivity(
    agentId: string,
    params?: PaginationParams
  ): Promise<GetActivityResponse> {
    const queryParams: Record<string, string> = {
      limit: String(params?.limit || 50),
      offset: String(params?.offset || 0),
    };
    return apiClient.get<GetActivityResponse>(`/agents/${agentId}/activity`, queryParams);
  },

  /**
   * Get global activity feed (all agents)
   */
  async getAllActivity(params?: PaginationParams): Promise<GetActivityResponse> {
    const queryParams: Record<string, string> = {
      limit: String(params?.limit || 100),
      offset: String(params?.offset || 0),
    };
    return apiClient.get<GetActivityResponse>('/activity', queryParams);
  },

  /**
   * Update agent tier
   */
  async updateTier(agentId: string, tier: 'free' | 'pro' | 'enterprise'): Promise<Agent> {
    const response = await apiClient.put<{ agent: Agent }>(`/agents/${agentId}/tier`, {
      tier,
    });
    return response.agent;
  },

  /**
   * Update agent permissions
   */
  async updatePermissions(
    agentId: string,
    permissions: string[]
  ): Promise<UpdatePermissionsResponse> {
    return apiClient.put<UpdatePermissionsResponse>(`/agents/${agentId}/permissions`, {
      permissions,
    });
  },

  /**
   * Get available permissions list
   */
  async getAvailablePermissions(): Promise<string[]> {
    const response = await apiClient.get<{ permissions: string[] }>('/permissions/list');
    return response.permissions;
  },

  // Aliases for convenience
  getById: (agentId: string) => agentsApi.get(agentId),
  getAgentActivity: (agentId: string, params?: PaginationParams) =>
    agentsApi.getActivity(agentId, params),
};
