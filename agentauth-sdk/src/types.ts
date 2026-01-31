import type { Permission } from './permissions';

/**
 * Core API types for AgentAuth SDK
 */

export interface AgentAuthConfig {
  /** Base URL of your AgentAuth API (e.g., https://auth.yourcompany.com) */
  baseURL: string;
  /** Optional API key for authenticated requests */
  apiKey?: string;
  /** Optional access token (JWT) for authenticated requests */
  accessToken?: string;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
}

export interface Agent {
  agent_id: string;
  name: string;
  owner_email: string;
  permissions: Permission[];
  status: 'active' | 'inactive' | 'suspended' | 'revoked';
  tier: 'free' | 'pro' | 'enterprise';
  created_at: string;
  updated_at: string;
}

export interface RegisterAgentRequest {
  name: string;
  owner_email: string;
  permissions: Permission[];
}

export interface RegisterAgentResponse {
  success: true;
  message: string;
  agent: Agent;
  credentials: {
    api_key: string;
    token_type: 'Bearer';
  };
}

export interface VerifyAgentRequest {
  agent_id: string;
  api_key: string;
}

export interface VerifyAgentResponse {
  success: true;
  message: string;
  agent: Agent;
  token: {
    access_token: string;
    refresh_token: string;
    token_type: 'Bearer';
    expires_in: number;
  };
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  success: true;
  message: string;
  token: {
    access_token: string;
    refresh_token: string;
    token_type: 'Bearer';
    expires_in: number;
  };
}

export interface RevokeTokensResponse {
  success: true;
  message: string;
  revoked_at: string;
}

export interface ListAgentsResponse {
  success: true;
  agents: Agent[];
  total: number;
}

export interface GetAgentResponse {
  success: true;
  agent: Agent;
}

export interface ActivityLog {
  id: string;
  agent_id: string;
  timestamp: string;
  ip_address: string;
  status: 'success' | 'failure';
  message?: string;
}

export interface GetActivityResponse {
  success: true;
  agent_id: string;
  activity: ActivityLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface Webhook {
  id: string;
  agent_id: string;
  url: string;
  events: string[];
  secret: string;
  created_at: string;
}

export interface RegisterWebhookRequest {
  url: string;
  events: string[];
}

export interface RegisterWebhookResponse {
  success: true;
  message: string;
  webhook: Webhook;
}

export interface ListWebhooksResponse {
  success: true;
  webhooks: Webhook[];
}

export interface DeleteWebhookResponse {
  success: true;
  message: string;
}

export interface RegenerateWebhookSecretResponse {
  success: true;
  message: string;
  webhook: Webhook;
}

export interface PermissionsListResponse {
  permissions: Record<string, string[]>;
  format: string;
  examples: string[];
  wildcards: Record<string, string>;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  database: 'connected' | 'disconnected';
  timestamp: string;
}

export interface AgentAuthError {
  error: string;
  details?: unknown;
  required?: Permission;
  granted?: Permission[];
}

// HTTP client types
export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  requiresAuth?: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
}
