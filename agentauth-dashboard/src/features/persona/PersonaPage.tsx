import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { agentsApi } from '../../api/agents';
import { personaApi } from '../../api/persona';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import type { Agent } from '../../types/agent';
import type { PersonaHistoryEntry } from '../../types/persona';

const DEFAULT_PERSONA = JSON.stringify(
  {
    version: '1.0.0',
    personality: {
      traits: { helpfulness: 0.9, formality: 0.7 },
    },
    guardrails: {
      toxicity_threshold: 0.3,
      hallucination_tolerance: 'strict',
    },
    constraints: {
      forbidden_topics: ['politics', 'religion'],
      max_response_length: 2000,
    },
  },
  null,
  2
);

export function PersonaPage() {
  const queryClient = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [personaJson, setPersonaJson] = useState(DEFAULT_PERSONA);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch agents for selector
  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list(),
  });

  // Fetch persona for selected agent
  const {
    data: persona,
    isLoading: personaLoading,
    error: personaError,
  } = useQuery({
    queryKey: ['persona', selectedAgentId],
    queryFn: () => personaApi.get(selectedAgentId, true),
    enabled: !!selectedAgentId,
    retry: false,
  });

  // Fetch persona history
  const { data: historyData } = useQuery({
    queryKey: ['persona-history', selectedAgentId],
    queryFn: () => personaApi.getHistory(selectedAgentId, { limit: 20 }),
    enabled: !!selectedAgentId && showHistory,
  });

  // Verify integrity
  const verifyMutation = useMutation({
    mutationFn: (agentId: string) => personaApi.verify(agentId),
    onSuccess: (data) => {
      if (data.valid) {
        toast.success(`Integrity verified: ${data.reason}`);
      } else {
        toast.error(`Integrity check failed: ${data.reason}`);
      }
      queryClient.invalidateQueries({ queryKey: ['persona-verify', selectedAgentId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Register / update persona
  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(personaJson);
      if (persona) {
        return personaApi.update(selectedAgentId, parsed);
      }
      return personaApi.register(selectedAgentId, parsed);
    },
    onSuccess: () => {
      toast.success(persona ? 'Persona updated' : 'Persona registered');
      queryClient.invalidateQueries({ queryKey: ['persona', selectedAgentId] });
      queryClient.invalidateQueries({ queryKey: ['persona-history', selectedAgentId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Load persona into editor when fetched
  const loadedPersona = useMemo(() => {
    if (persona?.persona) {
      return JSON.stringify(persona.persona, null, 2);
    }
    return null;
  }, [persona]);

  // Validate JSON on change
  function handleJsonChange(value: string) {
    setPersonaJson(value);
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch {
      setJsonError('Invalid JSON');
    }
  }

  // Load fetched persona into editor
  function handleLoadFromApi() {
    if (loadedPersona) {
      setPersonaJson(loadedPersona);
      setJsonError(null);
      toast.success('Loaded persona from server');
    }
  }

  // Export persona bundle
  async function handleExport() {
    try {
      const blob = await personaApi.exportBundle(selectedAgentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `persona-${selectedAgentId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Persona exported');
    } catch (err) {
      toast.error('Export failed');
    }
  }

  // Copy hash to clipboard
  async function handleCopyHash() {
    if (persona?.persona_hash) {
      await navigator.clipboard.writeText(persona.persona_hash);
      toast.success('Hash copied');
    }
  }

  const activeAgents = agents?.filter((a: Agent) => a.status === 'active') || [];

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
            Persona Manager
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Define and manage your agent&apos;s digital soul
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
          onChange={(e) => setSelectedAgentId(e.target.value)}
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
          {/* Status Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Integrity Badge */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                {persona ? (
                  verifyMutation.data?.valid === true ? (
                    <CheckCircleIcon className="w-8 h-8 text-green-500" />
                  ) : verifyMutation.data?.valid === false ? (
                    <XCircleIcon className="w-8 h-8 text-red-500" />
                  ) : (
                    <CheckCircleIcon className="w-8 h-8 text-gray-400" />
                  )
                ) : (
                  <XCircleIcon className="w-8 h-8 text-gray-400" />
                )}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Integrity</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {!persona
                      ? 'No Persona'
                      : verifyMutation.data?.valid === true
                        ? 'Verified'
                        : verifyMutation.data?.valid === false
                          ? 'Tampered'
                          : 'Unchecked'}
                  </p>
                </div>
              </div>
              {persona && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => verifyMutation.mutate(selectedAgentId)}
                  isLoading={verifyMutation.isPending}
                >
                  Verify Integrity
                </Button>
              )}
            </div>

            {/* Version */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                <ClockIcon className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Version</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {persona?.persona_version || '—'}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 w-full"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? 'Hide History' : 'View History'}
              </Button>
            </div>

            {/* Hash */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                <DocumentDuplicateIcon className="w-8 h-8 text-purple-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Hash</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white truncate">
                    {persona?.persona_hash || '—'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={handleCopyHash}
                  disabled={!persona?.persona_hash}
                >
                  Copy
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={handleExport}
                  disabled={!persona}
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Version History */}
          {showHistory && historyData && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Version History
              </h2>
              {historyData.history.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No history yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                          Version
                        </th>
                        <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                          Hash
                        </th>
                        <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                          Changed At
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.history.map((entry: PersonaHistoryEntry) => (
                        <tr
                          key={entry.id}
                          className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                        >
                          <td className="py-2 px-3">
                            <Badge variant="info" size="sm">
                              {entry.persona_version}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                            {entry.persona_hash.slice(0, 16)}...
                          </td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                            {new Date(entry.changed_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {historyData.total > historyData.history.length && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Showing {historyData.history.length} of {historyData.total} versions
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* JSON Editor */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Persona Definition
              </h2>
              <div className="flex gap-2">
                {loadedPersona && (
                  <Button variant="ghost" size="sm" onClick={handleLoadFromApi}>
                    <ArrowPathIcon className="w-4 h-4 mr-1" />
                    Load from API
                  </Button>
                )}
              </div>
            </div>

            <textarea
              value={personaJson}
              onChange={(e) => handleJsonChange(e.target.value)}
              rows={18}
              spellCheck={false}
              className={`w-full font-mono text-sm px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-900 border text-gray-900 dark:text-gray-100 focus:ring-2 focus:outline-none resize-y ${
                jsonError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-primary'
              }`}
            />

            {jsonError && (
              <p className="mt-1 text-sm text-red-500">{jsonError}</p>
            )}

            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {persona ? 'Saving will auto-bump the minor version' : 'This will register a new persona'}
              </p>
              <Button
                variant="primary"
                onClick={() => saveMutation.mutate()}
                disabled={!!jsonError || !personaJson.trim()}
                isLoading={saveMutation.isPending}
              >
                {persona ? 'Update Persona' : 'Register Persona'}
              </Button>
            </div>
          </div>

          {/* Prompt Template Preview */}
          {persona?.prompt && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Generated Prompt
              </h2>
              <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap overflow-x-auto">
                {persona.prompt}
              </pre>
            </div>
          )}

          {/* Loading / Error states */}
          {personaLoading && (
            <div className="py-8">
              <LoadingSpinner size="lg" />
            </div>
          )}
          {personaError && !persona && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No persona registered for this agent yet. Use the editor above to create one.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
