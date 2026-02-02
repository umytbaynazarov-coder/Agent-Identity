const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { LRUCache } = require('lru-cache');
const logger = require('../config/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Import canonicalize + fireWebhook from personaService for HMAC consistency
const { canonicalize } = require('./personaService');

// Lazy-require to avoid circular dependency
function getFireWebhook() {
  return require('./personaService').fireWebhook || (() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// LRU cache — last 10 pings per agent for fast std-dev calculation
// ─────────────────────────────────────────────────────────────────────────────

const pingCache = new LRUCache({
  max: 500, // Up to 500 agents tracked in-memory
  ttl: 1000 * 60 * 60, // 1 hour TTL
});

/**
 * Get cached pings for an agent, returns array of metric snapshots.
 */
function getCachedPings(agentId) {
  return pingCache.get(agentId) || [];
}

/**
 * Push a new ping into the per-agent cache (keeps last 10).
 */
function cachePing(agentId, metrics) {
  const pings = getCachedPings(agentId);
  pings.push(metrics);
  if (pings.length > 10) pings.shift();
  pingCache.set(agentId, pings);
}

// ─────────────────────────────────────────────────────────────────────────────
// Drift score calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate drift score between current and baseline metrics.
 *
 * If no weights configured: use equal weights (1/numMetrics each).
 * For each metric in weights:
 *   if baseline[metric] === 0: delta = current[metric]
 *   else: delta = |current - baseline| / baseline
 *   delta = Math.min(delta, 1.0)
 *   weighted_delta = delta * weight
 * drift_score = sum(weighted_deltas) / sum(weights)
 */
function calculateDriftScore(currentMetrics, baselineMetrics, weights) {
  if (!baselineMetrics || !currentMetrics) return 0;

  const metricKeys = Object.keys(currentMetrics);
  if (metricKeys.length === 0) return 0;

  // If no weights, use equal weights for all current metric keys
  const effectiveWeights = weights && Object.keys(weights).length > 0
    ? weights
    : metricKeys.reduce((acc, key) => {
        acc[key] = 1 / metricKeys.length;
        return acc;
      }, {});

  let weightedSum = 0;
  let weightSum = 0;

  for (const [metric, weight] of Object.entries(effectiveWeights)) {
    const current = currentMetrics[metric];
    const baseline = baselineMetrics[metric];

    if (current === undefined || baseline === undefined) continue;

    let delta;
    if (baseline === 0) {
      delta = Math.abs(current);
    } else {
      delta = Math.abs(current - baseline) / Math.abs(baseline);
    }
    delta = Math.min(delta, 1.0);

    weightedSum += delta * weight;
    weightSum += weight;
  }

  if (weightSum === 0) return 0;

  return Math.round((weightedSum / weightSum) * 1e10) / 1e10;
}

// ─────────────────────────────────────────────────────────────────────────────
// Spike detection via std-dev anomaly detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute standard deviation from an array of numbers.
 */
function stddev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.map(v => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Detect metric spikes using cached ping history.
 * Flags "spike" if any metric delta > spike_sensitivity standard deviations.
 * Gracefully skips if < 3 pings exist.
 */
function detectSpikes(agentId, currentMetrics, spikeSensitivity) {
  const cachedPings = getCachedPings(agentId);
  const anomalyNotes = [];

  // Need at least 3 pings for meaningful std-dev
  if (cachedPings.length < 3) {
    return anomalyNotes;
  }

  const sensitivity = spikeSensitivity || 2.0;

  for (const metric of Object.keys(currentMetrics)) {
    const historicalValues = cachedPings
      .map(p => p[metric])
      .filter(v => v !== undefined && v !== null);

    if (historicalValues.length < 3) continue;

    const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
    const sd = stddev(historicalValues);

    if (sd === 0) continue;

    const delta = Math.abs(currentMetrics[metric] - mean) / sd;

    if (delta > sensitivity) {
      anomalyNotes.push({
        metric,
        delta: Math.round(delta * 100) / 100,
        threshold: sensitivity,
        mean: Math.round(mean * 1e6) / 1e6,
        stddev: Math.round(sd * 1e6) / 1e6,
        current_value: currentMetrics[metric],
      });
    }
  }

  return anomalyNotes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ping signature verification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify a health ping's HMAC signature using canonicalize() for consistency.
 */
function verifyPingSignature(pingData, apiKey, providedSignature) {
  if (!providedSignature) return true; // Signature optional if not provided
  const canonical = JSON.stringify(canonicalize(pingData));
  const expected = crypto.createHmac('sha256', apiKey).update(canonical).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(providedSignature, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-revoke check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check drift thresholds and fire webhooks / auto-revoke.
 * At warning_threshold: fire agent.drift.warning webhook.
 * At drift_threshold: revoke + fire agent.drift.revoked.
 */
async function autoRevokeCheck(agentId, driftScore, config, metricsSummary) {
  const fireWebhook = getFireWebhook();
  const timestamp = new Date().toISOString();

  // Warning threshold check
  if (config.warning_threshold && driftScore >= config.warning_threshold && driftScore < config.drift_threshold) {
    logger.warn('Agent drift warning', { agent_id: agentId, drift_score: driftScore, threshold: config.warning_threshold });

    await fireWebhook(agentId, 'agent.drift.warning', {
      drift_score: driftScore,
      threshold: config.warning_threshold,
      agent_id: agentId,
      metrics_summary: metricsSummary,
      timestamp,
    });

    return { action: 'warning', drift_score: driftScore, threshold: config.warning_threshold };
  }

  // Drift threshold — auto-revoke if enabled
  if (driftScore >= config.drift_threshold) {
    logger.error('Agent drift threshold exceeded', { agent_id: agentId, drift_score: driftScore, threshold: config.drift_threshold });

    if (config.auto_revoke) {
      // Revoke the agent
      const { error } = await supabase
        .from('agents')
        .update({ status: 'revoked' })
        .eq('agent_id', agentId);

      if (error) {
        logger.error('Auto-revoke failed', { agent_id: agentId, error: error.message });
      }
    }

    await fireWebhook(agentId, 'agent.drift.revoked', {
      drift_score: driftScore,
      threshold: config.drift_threshold,
      agent_id: agentId,
      auto_revoked: !!config.auto_revoke,
      metrics_summary: metricsSummary,
      timestamp,
    });

    return { action: 'revoked', drift_score: driftScore, threshold: config.drift_threshold, auto_revoked: !!config.auto_revoke };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record a health ping for an agent.
 * Validate active; verify ping signature using canonicalize();
 * insert, calculate drift, check auto-revoke.
 */
async function recordHealthPing(agentId, pingData, apiKey) {
  // Verify agent is active
  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .select('agent_id, status')
    .eq('agent_id', agentId)
    .single();

  if (agentErr || !agent) {
    return { error: 'Agent not found' };
  }

  if (agent.status !== 'active') {
    return { error: 'Agent is not active', status: agent.status };
  }

  // Verify ping signature if provided
  if (pingData.signature) {
    const { signature, ...dataWithoutSig } = pingData;
    if (!verifyPingSignature(dataWithoutSig, apiKey, signature)) {
      return { error: 'Invalid ping signature' };
    }
  }

  // Fetch drift config
  const { data: config } = await supabase
    .from('drift_configs')
    .select('*')
    .eq('agent_id', agentId)
    .single();

  const driftConfig = config || {
    drift_threshold: 0.30,
    warning_threshold: 0.24,
    auto_revoke: true,
    metric_weights: null,
    baseline_metrics: null,
    spike_sensitivity: 2.0,
  };

  // Calculate drift score
  const driftScore = calculateDriftScore(
    pingData.metrics,
    driftConfig.baseline_metrics,
    driftConfig.metric_weights
  );

  // Detect spikes
  const anomalyNotes = detectSpikes(
    agentId,
    pingData.metrics,
    driftConfig.spike_sensitivity
  );

  // Insert ping into drift_health_pings
  const row = {
    agent_id: agentId,
    drift_score: driftScore,
    metrics: pingData.metrics,
    request_count: pingData.request_count || null,
    period_start: pingData.period_start || null,
    period_end: pingData.period_end || null,
  };

  const { data: ping, error: insertErr } = await supabase
    .from('drift_health_pings')
    .insert(row)
    .select()
    .single();

  if (insertErr) throw insertErr;

  // Cache the ping for spike detection
  cachePing(agentId, pingData.metrics);

  // Build metrics summary for webhooks
  const metricsSummary = {
    metrics: pingData.metrics,
    baseline: driftConfig.baseline_metrics,
    drift_score: driftScore,
    anomaly_notes: anomalyNotes,
  };

  // Check auto-revoke / warning thresholds
  let warning = null;
  const revokeResult = await autoRevokeCheck(agentId, driftScore, driftConfig, metricsSummary);
  if (revokeResult) {
    warning = revokeResult;
  }

  const result = {
    ping_id: ping.id,
    drift_score: driftScore,
    status: warning ? warning.action : 'ok',
  };

  if (warning) {
    result.warning = warning;
  }

  if (anomalyNotes.length > 0) {
    result.anomaly_notes = anomalyNotes;
  }

  logger.info('Health ping recorded', {
    agent_id: agentId,
    ping_id: ping.id,
    drift_score: driftScore,
    spikes: anomalyNotes.length,
    status: result.status,
  });

  return result;
}

/**
 * Get current drift score + thresholds + trend (last 5) + spike warnings.
 */
async function getDriftScore(agentId) {
  // Fetch config
  const { data: config } = await supabase
    .from('drift_configs')
    .select('*')
    .eq('agent_id', agentId)
    .single();

  // Fetch last 5 pings for trend
  const { data: recentPings, error } = await supabase
    .from('drift_health_pings')
    .select('drift_score, metrics, created_at')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) throw error;

  if (!recentPings || recentPings.length === 0) {
    return {
      agent_id: agentId,
      drift_score: null,
      message: 'No health pings recorded yet',
      thresholds: config ? {
        drift_threshold: config.drift_threshold,
        warning_threshold: config.warning_threshold,
      } : null,
    };
  }

  const latestScore = recentPings[0].drift_score;
  const trend = recentPings.map(p => ({
    drift_score: p.drift_score,
    created_at: p.created_at,
  }));

  // Check for spikes in the latest ping using cached data
  const latestMetrics = recentPings[0].metrics;
  const anomalyNotes = latestMetrics
    ? detectSpikes(agentId, latestMetrics, config?.spike_sensitivity)
    : [];

  return {
    agent_id: agentId,
    drift_score: latestScore,
    thresholds: config ? {
      drift_threshold: config.drift_threshold,
      warning_threshold: config.warning_threshold,
      auto_revoke: config.auto_revoke,
    } : null,
    trend,
    spike_warnings: anomalyNotes.length > 0 ? anomalyNotes : undefined,
  };
}

/**
 * Get drift history with pagination, date range, sort, metric filter, and CSV export.
 */
async function getDriftHistory(agentId, { limit = 20, offset = 0, from, to, sort = 'desc', metric, format = 'json' } = {}) {
  const ascending = sort === 'asc';

  let query = supabase
    .from('drift_health_pings')
    .select('*', { count: 'exact' })
    .eq('agent_id', agentId)
    .order('created_at', { ascending });

  if (from) {
    query = query.gte('created_at', from);
  }
  if (to) {
    query = query.lte('created_at', to);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  let results = data || [];

  // Single-metric filter: extract only that metric from each ping
  if (metric && results.length > 0) {
    results = results.map(row => ({
      id: row.id,
      agent_id: row.agent_id,
      drift_score: row.drift_score,
      metric_value: row.metrics?.[metric] ?? null,
      metric_name: metric,
      created_at: row.created_at,
    }));
  }

  if (format === 'csv') {
    let header;
    let rows;

    if (metric) {
      header = 'id,agent_id,drift_score,metric_name,metric_value,created_at';
      rows = results.map(r =>
        `${r.id},${r.agent_id},${r.drift_score},${r.metric_name},${r.metric_value},${r.created_at}`
      );
    } else {
      header = 'id,agent_id,drift_score,request_count,period_start,period_end,created_at';
      rows = results.map(r =>
        `${r.id},${r.agent_id},${r.drift_score},${r.request_count || ''},${r.period_start || ''},${r.period_end || ''},${r.created_at}`
      );
    }

    return { csv: [header, ...rows].join('\n'), total: count };
  }

  return {
    history: results,
    total: count,
    limit,
    offset,
  };
}

/**
 * Upsert drift configuration for an agent.
 */
async function configureDrift(agentId, config) {
  const row = { agent_id: agentId };

  if (config.drift_threshold !== undefined) row.drift_threshold = config.drift_threshold;
  if (config.warning_threshold !== undefined) row.warning_threshold = config.warning_threshold;
  if (config.auto_revoke !== undefined) row.auto_revoke = config.auto_revoke;
  if (config.metric_weights !== undefined) row.metric_weights = config.metric_weights;
  if (config.baseline_metrics !== undefined) row.baseline_metrics = config.baseline_metrics;
  if (config.spike_sensitivity !== undefined) row.spike_sensitivity = config.spike_sensitivity;

  const { data, error } = await supabase
    .from('drift_configs')
    .upsert(row, { onConflict: 'agent_id' })
    .select()
    .single();

  if (error) throw error;

  logger.info('Drift config updated', { agent_id: agentId });

  return data;
}

/**
 * Fetch drift configuration for an agent.
 */
async function getDriftConfig(agentId) {
  const { data, error } = await supabase
    .from('drift_configs')
    .select('*')
    .eq('agent_id', agentId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  return data || null;
}

module.exports = {
  calculateDriftScore,
  detectSpikes,
  recordHealthPing,
  getDriftScore,
  getDriftHistory,
  configureDrift,
  getDriftConfig,
  autoRevokeCheck,
};
