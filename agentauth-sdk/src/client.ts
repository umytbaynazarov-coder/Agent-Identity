import type {
  AgentAuthConfig,
  RegisterAgentRequest,
  RegisterAgentResponse,
  VerifyAgentRequest,
  VerifyAgentResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RevokeTokensResponse,
  ListAgentsResponse,
  GetAgentResponse,
  GetActivityResponse,
  RegisterWebhookRequest,
  RegisterWebhookResponse,
  ListWebhooksResponse,
  DeleteWebhookResponse,
  RegenerateWebhookSecretResponse,
  PermissionsListResponse,
  HealthCheckResponse,
  RequestOptions,
  Persona,
  PersonaResponse,
  PersonaVerifyResponse,
  PersonaHistoryResponse,
  PersonaUpdateResponse,
  RegisterCommitmentRequest,
  RegisterCommitmentResponse,
  VerifyAnonymousRequest,
  VerifyAnonymousResponse,
  HealthPingRequest,
  HealthPingResponse,
  DriftScoreResponse,
  DriftHistoryResponse,
  DriftConfig,
} from './types';
import { retryWithBackoff, parseErrorResponse, buildQueryString, validateBaseURL } from './utils';

/**
 * AgentAuth SDK Client
 * Lightweight, type-safe client for AgentAuth API
 */
export class AgentAuthClient {
  private baseURL: string;
  private apiKey?: string;
  private accessToken?: string;
  private maxRetries: number;
  private timeout: number;

  constructor(config: AgentAuthConfig) {
    validateBaseURL(config.baseURL);
    this.baseURL = config.baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;
    this.maxRetries = config.maxRetries ?? 3;
    this.timeout = config.timeout ?? 10000;
  }

  /**
   * Set the access token (JWT) for authenticated requests
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Set the API key for authenticated requests
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Internal HTTP request method with retry logic
   */
  private async request<T>(options: RequestOptions): Promise<T> {
    const { method, path, body, params, requiresAuth = false, headers: extraHeaders } = options;

    const makeRequest = async (): Promise<T> => {
      const query = params ? buildQueryString(params as Record<string, string | number | boolean>) : '';
      const url = `${this.baseURL}${path}${query}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...extraHeaders,
      };

      if (requiresAuth && this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          await parseErrorResponse(response);
        }

        return (await response.json()) as T;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    return retryWithBackoff(makeRequest, {
      maxRetries: this.maxRetries,
      baseDelay: 1000,
      maxDelay: 10000,
    });
  }

  // ============================================
  // Agent Management
  // ============================================

  /**
   * Register a new agent with permissions
   */
  async registerAgent(request: RegisterAgentRequest): Promise<RegisterAgentResponse> {
    return this.request<RegisterAgentResponse>({
      method: 'POST',
      path: '/agents/register',
      body: request,
    });
  }

  /**
   * Verify agent credentials and get JWT token
   */
  async verifyAgent(request: VerifyAgentRequest): Promise<VerifyAgentResponse> {
    const response = await this.request<VerifyAgentResponse>({
      method: 'POST',
      path: '/agents/verify',
      body: request,
    });

    // Auto-update access token
    this.setAccessToken(response.token.access_token);

    return response;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const response = await this.request<RefreshTokenResponse>({
      method: 'POST',
      path: '/agents/refresh',
      body: request,
    });

    // Auto-update access token
    this.setAccessToken(response.token.access_token);

    return response;
  }

  /**
   * Revoke all refresh tokens for the authenticated agent
   */
  async revokeTokens(): Promise<RevokeTokensResponse> {
    return this.request<RevokeTokensResponse>({
      method: 'POST',
      path: '/agents/revoke-tokens',
      requiresAuth: true,
    });
  }

  /**
   * List all agents (admin only)
   */
  async listAgents(): Promise<ListAgentsResponse> {
    return this.request<ListAgentsResponse>({
      method: 'GET',
      path: '/agents',
      requiresAuth: true,
    });
  }

  /**
   * Get agent details by ID
   */
  async getAgent(agentId: string): Promise<GetAgentResponse> {
    return this.request<GetAgentResponse>({
      method: 'GET',
      path: `/agents/${agentId}`,
      requiresAuth: true,
    });
  }

  /**
   * Revoke/deactivate an agent
   */
  async revokeAgent(agentId: string): Promise<{ success: true; message: string }> {
    return this.request({
      method: 'POST',
      path: `/agents/${agentId}/revoke`,
      requiresAuth: true,
    });
  }

  /**
   * Get activity logs for an agent
   */
  async getActivity(
    agentId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<GetActivityResponse> {
    const query = params ? buildQueryString(params as Record<string, string | number>) : '';
    return this.request<GetActivityResponse>({
      method: 'GET',
      path: `/agents/${agentId}/activity${query}`,
      requiresAuth: true,
    });
  }

  /**
   * Update agent tier (admin only)
   */
  async updateAgentTier(
    agentId: string,
    tier: 'free' | 'pro' | 'enterprise'
  ): Promise<{ success: true; message: string; agent: GetAgentResponse['agent'] }> {
    return this.request({
      method: 'PUT',
      path: `/agents/${agentId}/tier`,
      body: { tier },
      requiresAuth: true,
    });
  }

  // ============================================
  // Webhooks
  // ============================================

  /**
   * Register a new webhook
   */
  async registerWebhook(request: RegisterWebhookRequest): Promise<RegisterWebhookResponse> {
    return this.request<RegisterWebhookResponse>({
      method: 'POST',
      path: '/webhooks',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * List all webhooks for authenticated agent
   */
  async listWebhooks(): Promise<ListWebhooksResponse> {
    return this.request<ListWebhooksResponse>({
      method: 'GET',
      path: '/webhooks',
      requiresAuth: true,
    });
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<DeleteWebhookResponse> {
    return this.request<DeleteWebhookResponse>({
      method: 'DELETE',
      path: `/webhooks/${webhookId}`,
      requiresAuth: true,
    });
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateWebhookSecret(webhookId: string): Promise<RegenerateWebhookSecretResponse> {
    return this.request<RegenerateWebhookSecretResponse>({
      method: 'POST',
      path: `/webhooks/${webhookId}/regenerate-secret`,
      requiresAuth: true,
    });
  }

  /**
   * Get list of valid webhook events
   */
  async getWebhookEvents(): Promise<{ events: string[] }> {
    return this.request({
      method: 'GET',
      path: '/webhooks/events',
    });
  }

  // ============================================
  // Permissions & Health
  // ============================================

  /**
   * List all available permissions
   */
  async listPermissions(): Promise<PermissionsListResponse> {
    return this.request<PermissionsListResponse>({
      method: 'GET',
      path: '/permissions/list',
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>({
      method: 'GET',
      path: '/health',
    });
  }

  // ============================================
  // Persona ("Soul Layer")
  // ============================================

  /**
   * Register a persona for an agent
   */
  async registerPersona(
    agentId: string,
    persona: Persona,
  ): Promise<PersonaResponse> {
    return this.request<PersonaResponse>({
      method: 'POST',
      path: `/agents/${agentId}/persona`,
      body: persona,
      requiresAuth: true,
      headers: this.apiKey ? { 'X-Api-Key': this.apiKey } : undefined,
    });
  }

  /**
   * Get persona for an agent. Supports ETag-based caching.
   */
  async getPersona(
    agentId: string,
    options?: { includePrompt?: boolean; etag?: string },
  ): Promise<PersonaResponse | null> {
    const params: Record<string, string | number> = {};
    if (options?.includePrompt) params.includePrompt = 'true';

    const headers: Record<string, string> = {};
    if (options?.etag) headers['If-None-Match'] = options.etag;

    return this.request<PersonaResponse>({
      method: 'GET',
      path: `/agents/${agentId}/persona`,
      params: Object.keys(params).length ? params : undefined,
      headers: Object.keys(headers).length ? headers : undefined,
    });
  }

  /**
   * Get persona version history
   */
  async getPersonaHistory(
    agentId: string,
    params?: { limit?: number; offset?: number; sort?: 'asc' | 'desc'; format?: 'json' | 'csv' },
  ): Promise<PersonaHistoryResponse> {
    return this.request<PersonaHistoryResponse>({
      method: 'GET',
      path: `/agents/${agentId}/persona/history`,
      params: params as Record<string, string | number> | undefined,
    });
  }

  /**
   * Update persona for an agent
   */
  async updatePersona(
    agentId: string,
    persona: Persona,
  ): Promise<PersonaUpdateResponse> {
    return this.request<PersonaUpdateResponse>({
      method: 'PUT',
      path: `/agents/${agentId}/persona`,
      body: persona,
      requiresAuth: true,
      headers: this.apiKey ? { 'X-Api-Key': this.apiKey } : undefined,
    });
  }

  /**
   * Verify persona integrity (HMAC check)
   */
  async verifyPersona(agentId: string): Promise<PersonaVerifyResponse> {
    return this.request<PersonaVerifyResponse>({
      method: 'POST',
      path: `/agents/${agentId}/persona/verify`,
      requiresAuth: true,
      headers: this.apiKey ? { 'X-Api-Key': this.apiKey } : undefined,
    });
  }

  /**
   * Export persona as a signed ZIP bundle (returns URL/blob info)
   */
  async exportPersona(agentId: string): Promise<Response> {
    const query = '';
    const url = `${this.baseURL}/agents/${agentId}/persona/export${query}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        await parseErrorResponse(response);
      }
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Import a persona bundle
   */
  async importPersona(
    agentId: string,
    bundle: { persona: Persona; persona_hash: string; signature: string },
  ): Promise<PersonaResponse> {
    return this.request<PersonaResponse>({
      method: 'POST',
      path: `/agents/${agentId}/persona/import`,
      body: bundle,
      requiresAuth: true,
      headers: this.apiKey ? { 'X-Api-Key': this.apiKey } : undefined,
    });
  }

  // ============================================
  // ZKP Anonymous Verification
  // ============================================

  /**
   * Register a ZKP commitment for an agent
   */
  async registerCommitment(request: RegisterCommitmentRequest): Promise<RegisterCommitmentResponse> {
    return this.request<RegisterCommitmentResponse>({
      method: 'POST',
      path: '/zkp/register-commitment',
      body: request,
    });
  }

  /**
   * Verify a commitment anonymously (ZKP or hash mode)
   */
  async verifyAnonymous(request: VerifyAnonymousRequest): Promise<VerifyAnonymousResponse> {
    return this.request<VerifyAnonymousResponse>({
      method: 'POST',
      path: '/zkp/verify-anonymous',
      body: request,
    });
  }

  // ============================================
  // Anti-Drift Vault
  // ============================================

  /**
   * Submit a health ping with metrics
   */
  async submitHealthPing(
    agentId: string,
    ping: HealthPingRequest,
  ): Promise<HealthPingResponse> {
    return this.request<HealthPingResponse>({
      method: 'POST',
      path: `/drift/${agentId}/health-ping`,
      body: ping,
      requiresAuth: true,
      headers: this.apiKey ? { 'X-Api-Key': this.apiKey } : undefined,
    });
  }

  /**
   * Submit a batch of health pings
   */
  async batchSubmitHealthPings(
    agentId: string,
    pings: HealthPingRequest[],
  ): Promise<HealthPingResponse[]> {
    const results: HealthPingResponse[] = [];
    for (const ping of pings) {
      const result = await this.submitHealthPing(agentId, ping);
      results.push(result);
    }
    return results;
  }

  /**
   * Get current drift score, thresholds, trend, and spike warnings
   */
  async getDriftScore(agentId: string): Promise<DriftScoreResponse> {
    return this.request<DriftScoreResponse>({
      method: 'GET',
      path: `/drift/${agentId}/drift-score`,
    });
  }

  /**
   * Get drift history with pagination and filtering
   */
  async getDriftHistory(
    agentId: string,
    params?: { limit?: number; offset?: number; from?: string; to?: string; sort?: 'asc' | 'desc'; metric?: string; format?: 'json' | 'csv' },
  ): Promise<DriftHistoryResponse> {
    return this.request<DriftHistoryResponse>({
      method: 'GET',
      path: `/drift/${agentId}/drift-history`,
      params: params as Record<string, string | number> | undefined,
    });
  }

  /**
   * Configure drift thresholds, weights, and spike sensitivity
   */
  async configureDrift(
    agentId: string,
    config: Partial<Omit<DriftConfig, 'agent_id'>>,
  ): Promise<DriftConfig> {
    return this.request<DriftConfig>({
      method: 'PUT',
      path: `/drift/${agentId}/drift-config`,
      body: config,
      requiresAuth: true,
      headers: this.apiKey ? { 'X-Api-Key': this.apiKey } : undefined,
    });
  }

  /**
   * Get drift configuration for an agent
   */
  async getDriftConfig(agentId: string): Promise<DriftConfig> {
    return this.request<DriftConfig>({
      method: 'GET',
      path: `/drift/${agentId}/drift-config`,
    });
  }
}
