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
  // Persona types
  Persona,
  PersonaTraits,
  PersonaConstraints,
  PersonaGuardrails,
  PersonaResponse,
  PersonaVerifyResponse,
  PersonaHistoryEntry,
  PersonaHistoryResponse,
  PersonaUpdateResponse,
  // ZKP types
  RegisterCommitmentRequest,
  RegisterCommitmentResponse,
  ZKPProof,
  VerifyAnonymousRequest,
  VerifyAnonymousResponse,
  // Drift types
  HealthPingMetrics,
  HealthPingRequest,
  AnomalyNote,
  HealthPingResponse,
  DriftScoreResponse,
  DriftHistoryEntry,
  DriftHistoryResponse,
  DriftConfig,
} from './types';
export {
  PersonaValidationError,
  DriftThresholdError,
  ZKPVerificationError,
} from './types';
