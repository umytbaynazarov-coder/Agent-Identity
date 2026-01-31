import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { agentsApi } from '../../api/agents';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

type FilterType = 'all' | 'success' | 'failure';

export function ActivityFeedPage() {
  const [filter, setFilter] = useState<FilterType>('all');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['activity'],
    queryFn: () => agentsApi.getAllActivity({ limit: 100 }),
    refetchInterval: 10000, // Poll every 10 seconds
    refetchIntervalInBackground: true,
  });

  const filteredActivity = data?.activity.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'success') return log.success;
    if (filter === 'failure') return !log.success;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Feed</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Real-time verification activity across all agents
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          title="Refresh"
        >
          <ArrowPathIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <FunnelIcon className="w-5 h-5 text-gray-500" />
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('success')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Success
          </button>
          <button
            onClick={() => setFilter('failure')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'failure'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Failures
          </button>
        </div>
      </div>

      {/* Activity feed */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-red-600 dark:text-red-400">
              Failed to load activity. Please try again.
            </p>
          </div>
        ) : filteredActivity && filteredActivity.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredActivity.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <div className="flex items-start gap-4">
                  {/* Status icon */}
                  <div className="flex-shrink-0 mt-1">
                    {log.success ? (
                      <CheckCircleIcon className="w-6 h-6 text-green-500" />
                    ) : (
                      <XCircleIcon className="w-6 h-6 text-red-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.agent_name || 'Unknown Agent'}
                      </p>
                      <Badge
                        variant={log.success ? 'success' : 'danger'}
                        size="sm"
                      >
                        {log.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {log.agent_id}
                    </p>
                    {log.reason && (
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        Reason: {log.reason}
                      </p>
                    )}
                    {log.ip_address && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        IP: {log.ip_address}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {formatDistanceToNow(new Date(log.timestamp), {
                        addSuffix: true,
                      })}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No activity logs found.
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredActivity && filteredActivity.length > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredActivity.length} of {data?.activity.length || 0} events
          {data?.pagination.has_more && ' (more available)'}
        </div>
      )}

      {/* Auto-refresh indicator */}
      <div className="text-xs text-gray-500 dark:text-gray-500 text-center">
        Auto-refreshing every 10 seconds
      </div>
    </div>
  );
}
