import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { webhooksApi } from '../../api/webhooks';
import type { WebhookEvent } from '../../types/webhook';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const AVAILABLE_EVENTS = [
  { id: 'agent.registered', name: 'Agent Registered', description: 'Triggered when a new agent is registered' },
  { id: 'agent.verified', name: 'Agent Verified', description: 'Triggered when an agent is successfully verified' },
  { id: 'agent.verification.failed', name: 'Verification Failed', description: 'Triggered when verification fails' },
  { id: 'agent.revoked', name: 'Agent Revoked', description: 'Triggered when an agent is revoked' },
  { id: 'agent.tier.updated', name: 'Tier Updated', description: 'Triggered when agent tier changes' },
];

export function WebhooksPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    url: '',
    events: [] as WebhookEvent[],
  });
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch webhooks
  const { data: webhooks, isLoading, error } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => webhooksApi.list(),
  });

  // Create webhook mutation
  const createMutation = useMutation({
    mutationFn: (data: { url: string; events: WebhookEvent[] }) =>
      webhooksApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setCreatedSecret(response.secret);
      setNewWebhook({ url: '', events: [] });
      toast.success('Webhook created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create webhook');
    },
  });

  // Delete webhook mutation
  const deleteMutation = useMutation({
    mutationFn: (webhookId: number) => webhooksApi.delete(webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete webhook');
    },
  });

  // Regenerate secret mutation
  const regenerateSecretMutation = useMutation({
    mutationFn: (webhookId: number) => webhooksApi.regenerateSecret(webhookId),
    onSuccess: (secret) => {
      toast.success('Secret regenerated successfully');
      setCreatedSecret(secret);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to regenerate secret');
    },
  });

  const handleCreateWebhook = () => {
    if (!newWebhook.url) {
      toast.error('Please enter a webhook URL');
      return;
    }

    if (!newWebhook.url.startsWith('https://')) {
      toast.error('Webhook URL must use HTTPS');
      return;
    }

    if (newWebhook.events.length === 0) {
      toast.error('Please select at least one event');
      return;
    }

    createMutation.mutate(newWebhook);
  };

  const toggleEvent = (eventId: WebhookEvent) => {
    setNewWebhook((prev) => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter((e) => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewWebhook({ url: '', events: [] });
    setCreatedSecret(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Webhooks
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage webhook endpoints for receiving event notifications
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Create Webhook
        </Button>
      </div>

      {/* Webhooks list */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-red-600 dark:text-red-400">
              Failed to load webhooks. Please try again.
            </p>
          </div>
        ) : webhooks && webhooks.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white font-mono truncate">
                        {webhook.url}
                      </p>
                      <Badge variant={webhook.is_active ? 'success' : 'neutral'} size="sm">
                        {webhook.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {webhook.events.map((event) => (
                        <span
                          key={event}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium"
                        >
                          {event}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Created {format(new Date(webhook.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => regenerateSecretMutation.mutate(webhook.id)}
                      disabled={regenerateSecretMutation.isPending}
                    >
                      <ArrowPathIcon className="w-4 h-4 mr-1" />
                      Regenerate Secret
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteMutation.mutate(webhook.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No webhooks configured.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-3"
            >
              Create your first webhook
            </Button>
          </div>
        )}
      </div>

      {/* Summary */}
      {webhooks && webhooks.length > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''} configured
        </div>
      )}

      {/* Create Webhook Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        title="Create Webhook"
        size="lg"
      >
        {createdSecret ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-lg">
              <p className="text-sm font-medium text-green-900 dark:text-green-200 mb-2">
                Webhook created successfully!
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                Save this secret securely. You won't be able to see it again.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Webhook Secret
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={createdSecret}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(createdSecret, 'secret')}
                >
                  {copiedId === 'secret' ? (
                    <CheckIcon className="w-5 h-5 text-green-600" />
                  ) : (
                    <ClipboardDocumentIcon className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={closeCreateModal}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                value={newWebhook.url}
                onChange={(e) =>
                  setNewWebhook({ ...newWebhook, url: e.target.value })
                }
                placeholder="https://example.com/webhooks/agentauth"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Must be a valid HTTPS URL
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                Events
              </label>
              <div className="space-y-2">
                {AVAILABLE_EVENTS.map((event) => (
                  <label
                    key={event.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <input
                      type="checkbox"
                      checked={newWebhook.events.includes(event.id)}
                      onChange={() => toggleEvent(event.id)}
                      className="mt-1 w-4 h-4 text-primary bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {event.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateWebhook}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Webhook'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
