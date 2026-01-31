import { apiClient } from './client';
import type { Webhook, CreateWebhookRequest, CreateWebhookResponse, WebhookEvent } from '../types/webhook';

export interface ListWebhooksResponse {
  webhooks: Webhook[];
}

export interface WebhookEventsResponse {
  events: WebhookEvent[];
}

export interface RegenerateSecretResponse {
  success: boolean;
  secret: string;
}

export const webhooksApi = {
  /**
   * List all webhooks for the authenticated agent
   */
  async list(): Promise<Webhook[]> {
    const response = await apiClient.get<ListWebhooksResponse>('/webhooks');
    return response.webhooks;
  },

  /**
   * Create a new webhook
   */
  async create(data: CreateWebhookRequest): Promise<CreateWebhookResponse> {
    return apiClient.post<CreateWebhookResponse>('/webhooks', data);
  },

  /**
   * Delete a webhook
   */
  async delete(webhookId: number): Promise<void> {
    await apiClient.delete(`/webhooks/${webhookId}`);
  },

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(webhookId: number): Promise<string> {
    const response = await apiClient.post<RegenerateSecretResponse>(
      `/webhooks/${webhookId}/regenerate-secret`
    );
    return response.secret;
  },

  /**
   * Get list of available webhook events
   */
  async getEvents(): Promise<WebhookEvent[]> {
    const response = await apiClient.get<WebhookEventsResponse>('/webhooks/events');
    return response.events;
  },
};
