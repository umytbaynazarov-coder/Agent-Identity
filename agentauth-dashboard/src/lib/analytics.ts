import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
import type { VerificationLog, Agent } from '../types/agent';

export interface DailyStats {
  date: string;
  success: number;
  failure: number;
  total: number;
  successRate: number;
}

export interface AgentStats {
  agentId: string;
  agentName: string;
  total: number;
  success: number;
  failure: number;
  tier: string;
}

export interface TierStats {
  tier: string;
  count: number;
  color: string;
}

export function calculateDailyStats(
  logs: VerificationLog[],
  days: number = 7
): DailyStats[] {
  const endDate = new Date();
  const startDate = subDays(endDate, days - 1);

  // Generate array of dates
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  // Initialize stats for each date
  const statsMap = new Map<string, { success: number; failure: number }>();
  dateRange.forEach((date) => {
    const dateKey = format(startOfDay(date), 'yyyy-MM-dd');
    statsMap.set(dateKey, { success: 0, failure: 0 });
  });

  // Count successes and failures per day
  logs.forEach((log) => {
    const logDate = format(startOfDay(new Date(log.timestamp)), 'yyyy-MM-dd');
    const stats = statsMap.get(logDate);
    if (stats) {
      if (log.success) {
        stats.success++;
      } else {
        stats.failure++;
      }
    }
  });

  // Convert to array format for charts
  return Array.from(statsMap.entries())
    .map(([date, stats]) => ({
      date: format(new Date(date), 'MMM d'),
      success: stats.success,
      failure: stats.failure,
      total: stats.success + stats.failure,
      successRate: stats.success + stats.failure > 0
        ? (stats.success / (stats.success + stats.failure)) * 100
        : 0,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function calculateTopAgents(
  logs: VerificationLog[],
  agents: Agent[],
  limit: number = 10
): AgentStats[] {
  const agentStatsMap = new Map<string, AgentStats>();

  logs.forEach((log) => {
    const agentId = log.agent_id;
    if (!agentStatsMap.has(agentId)) {
      const agent = agents.find((a) => a.agent_id === agentId);
      agentStatsMap.set(agentId, {
        agentId,
        agentName: agent?.name || 'Unknown',
        total: 0,
        success: 0,
        failure: 0,
        tier: agent?.tier || 'free',
      });
    }

    const stats = agentStatsMap.get(agentId)!;
    stats.total++;
    if (log.success) {
      stats.success++;
    } else {
      stats.failure++;
    }
  });

  return Array.from(agentStatsMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function calculateRateLimitStats(logs: VerificationLog[]): TierStats[] {
  const tierColors = {
    free: '#EF4444',
    pro: '#F59E0B',
    enterprise: '#10B981',
  };

  // Filter for rate limit violations (assuming reason includes "rate limit")
  const rateLimitLogs = logs.filter(
    (log) => !log.success && log.reason?.toLowerCase().includes('rate limit')
  );

  const tierCounts = new Map<string, number>();

  rateLimitLogs.forEach((log) => {
    // You'd need to get the agent's tier from somewhere
    // For now, we'll assume it's in the log or we need to join with agents
    const tier = 'free'; // placeholder
    tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
  });

  return Array.from(tierCounts.entries()).map(([tier, count]) => ({
    tier: tier.charAt(0).toUpperCase() + tier.slice(1),
    count,
    color: tierColors[tier as keyof typeof tierColors] || '#6B7280',
  }));
}

export interface AnalyticsSummary {
  totalAgents: number;
  totalVerifications: number;
  successRate: number;
  activeAgents: number;
}

export function calculateSummary(
  agents: Agent[],
  logs: VerificationLog[]
): AnalyticsSummary {
  const successfulLogs = logs.filter((log) => log.success);
  const successRate =
    logs.length > 0 ? (successfulLogs.length / logs.length) * 100 : 0;

  // Count unique agents in logs as active
  const uniqueAgentIds = new Set(logs.map((log) => log.agent_id));

  return {
    totalAgents: agents.length,
    totalVerifications: logs.length,
    successRate: Math.round(successRate * 10) / 10,
    activeAgents: uniqueAgentIds.size,
  };
}
