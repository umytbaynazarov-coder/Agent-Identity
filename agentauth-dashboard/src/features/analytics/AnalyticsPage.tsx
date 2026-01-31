import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { agentsApi } from '../../api/agents';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { LineChart } from '../../components/charts/LineChart';
import { BarChart } from '../../components/charts/BarChart';
import { DonutChart } from '../../components/charts/DonutChart';
import {
  calculateDailyStats,
  calculateTopAgents,
  calculateSummary,
} from '../../lib/analytics';
import {
  ChartBarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

type DateRange = 7 | 30;

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>(7);

  // Fetch all agents
  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list(),
  });

  // Fetch activity logs for the selected date range
  const { data: activityData, isLoading } = useQuery({
    queryKey: ['analytics-activity', dateRange],
    queryFn: () => agentsApi.getAllActivity({ limit: 10000 }),
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!activityData?.activity || !agents) {
      return null;
    }

    const logs = activityData.activity;

    return {
      summary: calculateSummary(agents, logs),
      dailyStats: calculateDailyStats(logs, dateRange),
      topAgents: calculateTopAgents(logs, agents, 10),
    };
  }, [activityData, agents, dateRange]);

  // Prepare chart data
  const tierDistribution = useMemo(() => {
    if (!agents) return [];

    const tierCounts = agents.reduce(
      (acc, agent) => {
        acc[agent.tier] = (acc[agent.tier] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const tierColors = {
      free: '#6B7280',
      pro: '#0066FF',
      enterprise: '#00E5A0',
    };

    return Object.entries(tierCounts).map(([tier, count]) => ({
      name: tier.charAt(0).toUpperCase() + tier.slice(1),
      value: count,
      color: tierColors[tier as keyof typeof tierColors] || '#6B7280',
    }));
  }, [agents]);

  if (isLoading || !analytics) {
    return (
      <div className="p-6">
        <div className="py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Insights and metrics across all agents
          </p>
        </div>

        {/* Date range selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setDateRange(7)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              dateRange === 7
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setDateRange(30)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              dateRange === 30
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <UserGroupIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Agents
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {analytics.summary.totalAgents}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Success Rate
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {analytics.summary.successRate}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Verifications
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {analytics.summary.totalVerifications.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <BoltIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Active Agents
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {analytics.summary.activeAgents}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Rate Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Verification Success Rate
        </h2>
        <LineChart
          data={analytics.dailyStats}
          xKey="date"
          lines={[
            { dataKey: 'success', name: 'Success', color: '#00E5A0' },
            { dataKey: 'failure', name: 'Failure', color: '#EF4444' },
          ]}
          height={350}
        />
      </div>

      {/* Top Agents & Tier Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Agents Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Top 10 Agents by Volume
          </h2>
          {analytics.topAgents.length > 0 ? (
            <BarChart
              data={analytics.topAgents}
              xKey="agentName"
              bars={[{ dataKey: 'total', name: 'Requests', color: '#0066FF' }]}
              height={350}
            />
          ) : (
            <div className="py-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No agent data available
              </p>
            </div>
          )}
        </div>

        {/* Tier Distribution Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Agent Tier Distribution
          </h2>
          {tierDistribution.length > 0 ? (
            <DonutChart data={tierDistribution} height={350} />
          ) : (
            <div className="py-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No tier data available
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
