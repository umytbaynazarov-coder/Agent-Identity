import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { agentsApi } from '../../api/agents';
import { driftApi } from '../../api/drift';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { LineChart } from '../../components/charts/LineChart';
import {
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import type { Agent } from '../../types/agent';
import type { DriftHistoryEntry, AnomalyNote } from '../../types/drift';

function getDriftStatus(score: number | null, warning?: number, threshold?: number) {
  if (score === null) return { label: 'No Data', variant: 'neutral' as const };
  if (threshold && score >= threshold) return { label: 'Revoked', variant: 'danger' as const };
  if (warning && score >= warning) return { label: 'Warning', variant: 'warning' as const };
  return { label: 'Healthy', variant: 'success' as const };
}

function DriftGauge({ score, warning, threshold }: { score: number | null; warning: number; threshold: number }) {
  const pct = score !== null ? Math.min(score / (threshold * 1.2), 1) * 100 : 0;
  const warningPct = (warning / (threshold * 1.2)) * 100;
  const thresholdPct = (threshold / (threshold * 1.2)) * 100;

  let barColor = 'bg-green-500';
  if (score !== null) {
    if (score >= threshold) barColor = 'bg-red-500';
    else if (score >= warning) barColor = 'bg-yellow-500';
  }

  return (
    <div className="relative">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-4xl font-bold text-gray-900 dark:text-white">
          {score !== null ? score.toFixed(3) : '—'}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">drift score</span>
      </div>
      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
        {/* Warning marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-yellow-400"
          style={{ left: `${warningPct}%` }}
          title={`Warning: ${warning}`}
        />
        {/* Threshold marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-red-500"
          style={{ left: `${thresholdPct}%` }}
          title={`Threshold: ${threshold}`}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
        <span>0</span>
        <span className="text-yellow-500">warn: {warning}</span>
        <span className="text-red-500">revoke: {threshold}</span>
      </div>
    </div>
  );
}

export function DriftPage() {
  const queryClient = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    drift_threshold: 0.3,
    warning_threshold: 0.24,
    auto_revoke: true,
    spike_sensitivity: 2.0,
  });

  // Fetch agents
  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list(),
  });

  // Fetch drift score
  const { data: driftScore, isLoading: scoreLoading } = useQuery({
    queryKey: ['drift-score', selectedAgentId],
    queryFn: () => driftApi.getDriftScore(selectedAgentId),
    enabled: !!selectedAgentId,
    refetchInterval: 30000,
  });

  // Fetch drift history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['drift-history', selectedAgentId],
    queryFn: () => driftApi.getDriftHistory(selectedAgentId, { limit: 50 }),
    enabled: !!selectedAgentId,
  });

  // Fetch drift config
  const { data: driftConfig } = useQuery({
    queryKey: ['drift-config', selectedAgentId],
    queryFn: () => driftApi.getDriftConfig(selectedAgentId),
    enabled: !!selectedAgentId && showConfig,
    onSuccess: (data) => {
      setConfigForm({
        drift_threshold: data.drift_threshold,
        warning_threshold: data.warning_threshold,
        auto_revoke: data.auto_revoke,
        spike_sensitivity: data.spike_sensitivity,
      });
    },
  } as any);

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: () => driftApi.updateDriftConfig(selectedAgentId, configForm),
    onSuccess: () => {
      toast.success('Drift config updated');
      queryClient.invalidateQueries({ queryKey: ['drift-config', selectedAgentId] });
      queryClient.invalidateQueries({ queryKey: ['drift-score', selectedAgentId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Chart data from trend
  const trendChartData = useMemo(() => {
    if (!driftScore?.trend) return [];
    return driftScore.trend.map((t) => ({
      date: new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: t.drift_score,
    }));
  }, [driftScore]);

  // History chart data
  const historyChartData = useMemo(() => {
    if (!historyData?.history) return [];
    return [...historyData.history]
      .reverse()
      .map((h) => ({
        date: new Date(h.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        score: h.drift_score,
        requests: h.request_count || 0,
      }));
  }, [historyData]);

  // CSV export
  function handleExportCsv() {
    if (!historyData?.history) return;
    const header = 'id,agent_id,drift_score,created_at,request_count,metrics\n';
    const rows = historyData.history
      .map(
        (h: DriftHistoryEntry) =>
          `${h.id},${h.agent_id},${h.drift_score},${h.created_at},${h.request_count || ''},${h.metrics ? JSON.stringify(h.metrics) : ''}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drift-history-${selectedAgentId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }

  // Load config when toggling
  function handleToggleConfig() {
    setShowConfig(!showConfig);
    if (!showConfig && driftConfig) {
      setConfigForm({
        drift_threshold: driftConfig.drift_threshold,
        warning_threshold: driftConfig.warning_threshold,
        auto_revoke: driftConfig.auto_revoke,
        spike_sensitivity: driftConfig.spike_sensitivity,
      });
    }
  }

  const activeAgents = agents?.filter((a: Agent) => ['active', 'suspended'].includes(a.status)) || [];
  const warningThreshold = driftScore?.thresholds?.warning ?? 0.24;
  const driftThreshold = driftScore?.thresholds?.drift ?? 0.3;
  const status = getDriftStatus(driftScore?.drift_score ?? null, warningThreshold, driftThreshold);

  if (agentsLoading) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Anti-Drift Monitor
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Real-time behavioral drift detection and scoring
          </p>
        </div>
      </div>

      {/* Agent Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Agent
        </label>
        <select
          value={selectedAgentId}
          onChange={(e) => {
            setSelectedAgentId(e.target.value);
            setShowConfig(false);
          }}
          className="w-full md:w-96 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="">Choose an agent...</option>
          {activeAgents.map((agent: Agent) => (
            <option key={agent.agent_id} value={agent.agent_id}>
              {agent.name} ({agent.agent_id})
            </option>
          ))}
        </select>
      </div>

      {selectedAgentId && (
        <>
          {/* Drift Score Overview */}
          {scoreLoading ? (
            <div className="py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gauge */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Drift Score
                  </h2>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <DriftGauge
                  score={driftScore?.drift_score ?? null}
                  warning={warningThreshold}
                  threshold={driftThreshold}
                />
                {driftScore?.message && (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    {driftScore.message}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Actions
                </h2>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={handleToggleConfig}
                >
                  <Cog6ToothIcon className="w-4 h-4 mr-2" />
                  {showConfig ? 'Hide Config' : 'Configure Drift'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={handleExportCsv}
                  disabled={!historyData?.history?.length}
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          )}

          {/* Spike Warnings */}
          {driftScore?.spike_warnings && driftScore.spike_warnings.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                  Spike Anomalies Detected
                </h3>
              </div>
              <div className="space-y-1">
                {driftScore.spike_warnings.map((note: AnomalyNote, i: number) => (
                  <p key={i} className="text-sm text-yellow-700 dark:text-yellow-400">
                    <span className="font-mono font-medium">{note.metric}</span>: delta{' '}
                    {note.delta.toFixed(4)} exceeds threshold {note.threshold.toFixed(4)} (mean:{' '}
                    {note.mean.toFixed(4)}, stddev: {note.stddev.toFixed(4)}, current:{' '}
                    {note.current_value.toFixed(4)})
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Drift Config Form */}
          {showConfig && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Drift Configuration
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Drift Threshold */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Drift Threshold (revoke)
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.01"
                    value={configForm.drift_threshold}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, drift_threshold: parseFloat(e.target.value) })
                    }
                    className="w-full accent-red-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {configForm.drift_threshold.toFixed(2)}
                  </span>
                </div>

                {/* Warning Threshold */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Warning Threshold
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.01"
                    value={configForm.warning_threshold}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        warning_threshold: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-yellow-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {configForm.warning_threshold.toFixed(2)}
                  </span>
                </div>

                {/* Spike Sensitivity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Spike Sensitivity (std devs)
                  </label>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={configForm.spike_sensitivity}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        spike_sensitivity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-primary"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {configForm.spike_sensitivity.toFixed(1)}x
                  </span>
                </div>

                {/* Auto Revoke Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Auto Revoke
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setConfigForm({ ...configForm, auto_revoke: !configForm.auto_revoke })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      configForm.auto_revoke ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        configForm.auto_revoke ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {configForm.auto_revoke
                      ? 'Agent will be auto-revoked on threshold breach'
                      : 'Manual revocation only'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  variant="primary"
                  onClick={() => updateConfigMutation.mutate()}
                  isLoading={updateConfigMutation.isPending}
                >
                  Save Configuration
                </Button>
              </div>
            </div>
          )}

          {/* Trend Chart */}
          {(trendChartData.length > 0 || historyChartData.length > 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Drift Score Over Time
              </h2>
              <LineChart
                data={historyChartData.length > 0 ? historyChartData : trendChartData}
                xKey="date"
                lines={[{ dataKey: 'score', name: 'Drift Score', color: '#0066FF' }]}
                height={350}
              />
            </div>
          )}

          {/* Pings History Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Health Ping History
              </h2>
              <div className="flex items-center gap-2">
                <SignalIcon className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Auto-refreshes every 30s
                </span>
              </div>
            </div>

            {historyLoading ? (
              <LoadingSpinner size="md" />
            ) : historyData?.history && historyData.history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                        Score
                      </th>
                      <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                        Status
                      </th>
                      <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                        Requests
                      </th>
                      <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                        Metrics
                      </th>
                      <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.history.map((entry: DriftHistoryEntry) => {
                      const entryStatus = getDriftStatus(
                        entry.drift_score,
                        warningThreshold,
                        driftThreshold
                      );
                      return (
                        <tr
                          key={entry.id}
                          className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                        >
                          <td className="py-2 px-3 font-mono text-gray-900 dark:text-white">
                            {entry.drift_score.toFixed(4)}
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant={entryStatus.variant} size="sm">
                              {entryStatus.label}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                            {entry.request_count || '—'}
                          </td>
                          <td className="py-2 px-3">
                            {entry.metrics ? (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(entry.metrics).map(([key, val]) => (
                                  <span
                                    key={key}
                                    className="inline-block px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-400"
                                  >
                                    {key}: {typeof val === 'number' ? val.toFixed(3) : val}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400 text-xs">
                            {new Date(entry.created_at).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {historyData.total > historyData.history.length && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Showing {historyData.history.length} of {historyData.total} entries
                  </p>
                )}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No health pings recorded yet. Submit pings via the API or SDK.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
