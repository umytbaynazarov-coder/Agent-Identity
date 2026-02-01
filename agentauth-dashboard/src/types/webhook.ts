export type WebhookEvent = 'agent.registered' | 'agent.verified' | 'agent.revoked';

export interface Webhook {
  id: number;
  agent_id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateWebhookRequest {
  url: string;
  events: WebhookEvent[];
}

export interface CreateWebhookResponse {
  success: boolean;
  webhook: Webhook;
  secret: string;
}
