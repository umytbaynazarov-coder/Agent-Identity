import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { agentsApi } from '../../api/agents';
import { Badge, getStatusBadgeVariant } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AgentDetailsModal } from './AgentDetailsModal';
import type { Agent } from '../../types/agent';
import { format } from 'date-fns';

export function AgentsPage() {
  const [statusFilter, setStatusFilter] = useState<Agent['status'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const { data: agents, isLoading, error } = useQuery({
    queryKey: ['agents', statusFilter],
    queryFn: () =>
      agentsApi.list(statusFilter !== 'all' ? { status: statusFilter } : undefined),
  });

  // Client-side search filter
  const filteredAgents = agents?.filter((agent) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.owner_email.toLowerCase().includes(query) ||
      agent.agent_id.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agents</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage and monitor all registered agents
          </p>
        </div>
        <Button>
          <PlusIcon className="w-5 h-5 mr-2" />
          Register Agent
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or agent ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      {/* Agents table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-red-600 dark:text-red-400">
              Failed to load agents. Please try again.
            </p>
          </div>
        ) : filteredAgents && filteredAgents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Verified
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAgents.map((agent) => (
                  <tr
                    key={agent.agent_id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {agent.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {agent.agent_id}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {agent.owner_email}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusBadgeVariant(agent.status)}>
                        {agent.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="info" size="sm">
                        {agent.tier}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {format(new Date(agent.created_at), 'MMM d, yyyy')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {agent.last_verified_at
                          ? format(new Date(agent.last_verified_at), 'MMM d, yyyy')
                          : 'Never'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAgentId(agent.agent_id)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">No agents found.</p>
            {searchQuery && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Try adjusting your search query.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredAgents && filteredAgents.length > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredAgents.length} of {agents?.length || 0} agents
        </div>
      )}

      {/* Agent Details Modal */}
      {selectedAgentId && (
        <AgentDetailsModal
          isOpen={!!selectedAgentId}
          onClose={() => setSelectedAgentId(null)}
          agentId={selectedAgentId}
        />
      )}
    </div>
  );
}
