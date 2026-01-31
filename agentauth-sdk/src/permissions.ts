/**
 * Type-safe permission system for AgentAuth
 * Provides auto-completion for all service:resource:action permissions
 */

// Service definitions
export type Service = 'zendesk' | 'slack' | 'hubspot' | 'github' | 'salesforce' | 'stripe';

// Resource definitions per service
export type ZendeskResource = 'tickets' | 'users';
export type SlackResource = 'messages' | 'channels';
export type HubSpotResource = 'contacts' | 'deals' | 'companies';
export type GitHubResource = 'repos' | 'issues' | 'pull_requests';
export type SalesforceResource = 'accounts' | 'leads';
export type StripeResource = 'payments' | 'customers' | 'invoices';

// Action definitions
export type Action = 'read' | 'write';

// Combine into specific permission types
export type ZendeskPermission = `zendesk:${ZendeskResource}:${Action}`;
export type SlackPermission = `slack:${SlackResource}:${Action}`;
export type HubSpotPermission = `hubspot:${HubSpotResource}:${Action}`;
export type GitHubPermission = `github:${GitHubResource}:${Action}`;
export type SalesforcePermission = `salesforce:${SalesforceResource}:${Action}`;
export type StripePermission = `stripe:${StripeResource}:read`; // Stripe is read-only

// Wildcard permissions
export type AdminPermission = '*:*:*';
export type ServiceWildcard = `${Service}:*:*`;
export type ResourceWildcard =
  | `zendesk:${ZendeskResource}:*`
  | `slack:${SlackResource}:*`
  | `hubspot:${HubSpotResource}:*`
  | `github:${GitHubResource}:*`
  | `salesforce:${SalesforceResource}:*`
  | `stripe:${StripeResource}:*`;

// Combined permission type with full auto-completion
export type Permission =
  | ZendeskPermission
  | SlackPermission
  | HubSpotPermission
  | GitHubPermission
  | SalesforcePermission
  | StripePermission
  | AdminPermission
  | ServiceWildcard
  | ResourceWildcard;

// Permission builder helpers for better DX
export const Permissions = {
  Zendesk: {
    Tickets: {
      Read: 'zendesk:tickets:read' as const,
      Write: 'zendesk:tickets:write' as const,
      All: 'zendesk:tickets:*' as const,
    },
    Users: {
      Read: 'zendesk:users:read' as const,
      Write: 'zendesk:users:write' as const,
      All: 'zendesk:users:*' as const,
    },
    All: 'zendesk:*:*' as const,
  },
  Slack: {
    Messages: {
      Read: 'slack:messages:read' as const,
      Write: 'slack:messages:write' as const,
      All: 'slack:messages:*' as const,
    },
    Channels: {
      Read: 'slack:channels:read' as const,
      Write: 'slack:channels:write' as const,
      All: 'slack:channels:*' as const,
    },
    All: 'slack:*:*' as const,
  },
  HubSpot: {
    Contacts: {
      Read: 'hubspot:contacts:read' as const,
      Write: 'hubspot:contacts:write' as const,
      All: 'hubspot:contacts:*' as const,
    },
    Deals: {
      Read: 'hubspot:deals:read' as const,
      Write: 'hubspot:deals:write' as const,
      All: 'hubspot:deals:*' as const,
    },
    Companies: {
      Read: 'hubspot:companies:read' as const,
      All: 'hubspot:companies:*' as const,
    },
    All: 'hubspot:*:*' as const,
  },
  GitHub: {
    Repos: {
      Read: 'github:repos:read' as const,
      Write: 'github:repos:write' as const,
      All: 'github:repos:*' as const,
    },
    Issues: {
      Read: 'github:issues:read' as const,
      Write: 'github:issues:write' as const,
      All: 'github:issues:*' as const,
    },
    PullRequests: {
      Read: 'github:pull_requests:read' as const,
      All: 'github:pull_requests:*' as const,
    },
    All: 'github:*:*' as const,
  },
  Salesforce: {
    Accounts: {
      Read: 'salesforce:accounts:read' as const,
      Write: 'salesforce:accounts:write' as const,
      All: 'salesforce:accounts:*' as const,
    },
    Leads: {
      Read: 'salesforce:leads:read' as const,
      Write: 'salesforce:leads:write' as const,
      All: 'salesforce:leads:*' as const,
    },
    All: 'salesforce:*:*' as const,
  },
  Stripe: {
    Payments: {
      Read: 'stripe:payments:read' as const,
    },
    Customers: {
      Read: 'stripe:customers:read' as const,
    },
    Invoices: {
      Read: 'stripe:invoices:read' as const,
    },
    All: 'stripe:*:*' as const,
  },
  Admin: '*:*:*' as const,
} as const;

// Helper to validate permission format
export function isValidPermission(permission: string): permission is Permission {
  const parts = permission.split(':');
  if (parts.length !== 3) return false;

  const [service, resource, action] = parts;

  // Allow wildcards
  if (service === '*' && resource === '*' && action === '*') return true;

  // Check if service is valid
  const validServices = ['zendesk', 'slack', 'hubspot', 'github', 'salesforce', 'stripe'];
  if (!validServices.includes(service) && service !== '*') return false;

  return true;
}
