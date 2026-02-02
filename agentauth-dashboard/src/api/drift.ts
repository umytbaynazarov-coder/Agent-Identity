import { apiClient } from './client';
import type {
  HealthPingResponse,
  DriftScoreResponse,
  DriftHistoryResponse,
  DriftConfig,
} from '../types/drift';

export interface SubmitHealthPingRequest {
  metrics: Record<string, number>;
  request_count?: number;
  period_start?: string;
  period_end?: string;
  signature?: string;
}

export const driftApi = {
  /**
   * Submit a health ping with metrics
   */
  async submitHealthPing(
    agentId: string,
    data: SubmitHealthPingRequest
  ): Promise<HealthPingResponse> {
    return apiClient.post<HealthPingResponse>(`/drift/${agentId}/health-ping`, data);
  },

  /**
   * Get current drift score, thresholds, and trend
   */
  async getDriftScore(agentId: string): Promise<DriftScoreResponse> {
    return apiClient.get<DriftScoreResponse>(`/drift/${agentId}/drift-score`);
  },

  /**
   * Get drift history with pagination and filtering
   */
  async getDriftHistory(
    agentId: string,
    params?: {
      limit?: number;
      offset?: number;
      from?: string;
      to?: string;
      sort?: string;
      metric?: string;
    }
  ): Promise<DriftHistoryResponse> {
    const queryParams: Record<string, string> = {
      limit: String(params?.limit || 20),
      offset: String(params?.offset || 0),
      sort: params?.sort || 'desc',
    };
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;
    if (params?.metric) queryParams.metric = params.metric;

    return apiClient.get<DriftHistoryResponse>(
      `/drift/${agentId}/drift-history`,
      queryParams
    );
  },

  /**
   * Get drift configuration for an agent
   */
  async getDriftConfig(agentId: string): Promise<DriftConfig> {
    return apiClient.get<DriftConfig>(`/drift/${agentId}/drift-config`);
  },

  /**
   * Update drift configuration
   */
  async updateDriftConfig(
    agentId: string,
    config: Partial<Omit<DriftConfig, 'agent_id'>>
  ): Promise<DriftConfig> {
    return apiClient.put<DriftConfig>(`/drift/${agentId}/drift-config`, config);
  },
};
