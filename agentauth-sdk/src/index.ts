/**
 * AgentAuth SDK
 * Lightweight, type-safe authentication for AI agents
 *
 * @packageDocumentation
 */

export { AgentAuthClient } from './client';
export { Permissions } from './permissions';
export type {
  Permission,
  Service,
  ZendeskPermission,
  SlackPermission,
  HubSpotPermission,
  GitHubPermission,
  SalesforcePermission,
  StripePermission,
  AdminPermission,
  ServiceWildcard,
  ResourceWildcard,
} from './permissions';
export type {
  AgentAuthConfig,
  Agent,
  RegisterAgentRequest,
  RegisterAgentResponse,
  VerifyAgentRequest,
  VerifyAgentResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RevokeTokensResponse,
  ListAgentsResponse,
  GetAgentResponse,
  ActivityLog,
  GetActivityResponse,
  Webhook,
  RegisterWebhookRequest,
  RegisterWebhookResponse,
  ListWebhooksResponse,
  DeleteWebhookResponse,
  RegenerateWebhookSecretResponse,
  PermissionsListResponse,
  HealthCheckResponse,
  AgentAuthError,
} from './types';
