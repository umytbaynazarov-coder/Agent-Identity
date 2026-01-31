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
    const { method, path, body, requiresAuth = false } = options;

    const makeRequest = async (): Promise<T> => {
      const url = `${this.baseURL}${path}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
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
}
