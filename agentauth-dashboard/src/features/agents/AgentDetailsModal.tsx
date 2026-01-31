import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/common/Modal';
import { Badge, getStatusBadgeVariant } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { PermissionEditor } from './PermissionEditor';
import { agentsApi } from '../../api/agents';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import type { Agent } from '../../types/agent';
import {
  ClockIcon,
  ShieldCheckIcon,
  KeyIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface AgentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
}

type Tab = 'details' | 'permissions' | 'activity';

export function AgentDetailsModal({
  isOpen,
  onClose,
  agentId,
}: AgentDetailsModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  // Fetch agent details
  const {
    data: agent,
    isLoading,
    error,
  } = useQuery<Agent>({
    queryKey: ['agent', agentId],
    queryFn: () => agentsApi.getById(agentId),
    enabled: isOpen,
  });

  // Fetch agent activity
  const { data: activityData } = useQuery({
    queryKey: ['agent-activity', agentId],
    queryFn: () => agentsApi.getAgentActivity(agentId, { limit: 20 }),
    enabled: isOpen && activeTab === 'activity',
  });

  // Revoke mutation
  const revokeMutation = useMutation({
    mutationFn: () => agentsApi.revoke(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
      toast.success('Agent revoked successfully');
      setShowRevokeConfirm(false);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to revoke agent');
    },
  });

  const tabs = [
    { id: 'details' as const, label: 'Details', icon: ShieldCheckIcon },
    { id: 'permissions' as const, label: 'Permissions', icon: KeyIcon },
    { id: 'activity' as const, label: 'Activity', icon: ChartBarIcon },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agent Details" size="xl">
      {isLoading ? (
        <div className="py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-red-600 dark:text-red-400">
            Failed to load agent details. Please try again.
          </p>
        </div>
      ) : agent ? (
        <div className="space-y-6">
          {/* Header with agent info */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {agent.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono mt-1">
                {agent.agent_id}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(agent.status)}>
                {agent.status}
              </Badge>
              <Badge variant="info" size="sm">
                {agent.tier}
              </Badge>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab content */}
          <div className="min-h-[400px]">
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Owner Email
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {agent.owner_email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Tier
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white capitalize">
                      {agent.tier}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Created At
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {format(new Date(agent.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Last Verified
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {agent.last_verified_at
                        ? format(new Date(agent.last_verified_at), 'MMM d, yyyy HH:mm')
                        : 'Never'}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Permissions
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {agent.permissions?.length || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Webhooks
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {agent.webhook_count || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Status</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 capitalize">
                      {agent.status}
                    </p>
                  </div>
                </div>

                {/* Revoke section */}
                {agent.status === 'active' && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-red-900 dark:text-red-200">
                          Danger Zone
                        </h4>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          Revoking this agent will immediately invalidate all API
                          keys and prevent future authentications.
                        </p>
                        {!showRevokeConfirm ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setShowRevokeConfirm(true)}
                            className="mt-3"
                          >
                            Revoke Agent
                          </Button>
                        ) : (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-sm text-red-900 dark:text-red-200">
                              Are you sure?
                            </span>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => revokeMutation.mutate()}
                              disabled={revokeMutation.isPending}
                            >
                              {revokeMutation.isPending
                                ? 'Revoking...'
                                : 'Confirm Revoke'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowRevokeConfirm(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'permissions' && (
              <PermissionEditor agent={agent} onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
              }} />
            )}

            {activeTab === 'activity' && (
              <div className="space-y-3">
                {!activityData ? (
                  <div className="py-8">
                    <LoadingSpinner size="md" />
                  </div>
                ) : activityData.activity.length === 0 ? (
                  <div className="py-8 text-center">
                    <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No recent activity
                    </p>
                  </div>
                ) : (
                  activityData.activity.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={log.success ? 'success' : 'danger'}
                              size="sm"
                            >
                              {log.success ? 'Success' : 'Failed'}
                            </Badge>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDistanceToNow(new Date(log.timestamp), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          {log.reason && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {log.reason}
                            </p>
                          )}
                          {log.ip_address && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              IP: {log.ip_address}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-600">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
