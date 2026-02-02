const express = require('express');
const router = express.Router({ mergeParams: true });
const driftService = require('../services/driftService');
const driftValidator = require('../validators/driftValidator');
const agentService = require('../services/agentService');
const { authLimiter } = require('../middleware/rateLimiter');
const { APIError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * Middleware: extract and verify API key from X-Api-Key header.
 * Attaches verified agent to req.agent.
 */
async function requireApiKey(req, _res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return next(new APIError('Missing X-Api-Key header', 401));
  }

  const { agent_id } = req.params;
  const agent = await agentService.verifyAgent(agent_id, apiKey);
  if (!agent) {
    return next(new APIError('Invalid API key or agent not found', 401));
  }

  req.agent = agent;
  req.apiKey = apiKey;
  next();
}

/**
 * POST /:agent_id/health-ping
 * Submit a health ping with metrics. X-Api-Key required for HMAC verification.
 */
router.post('/:agent_id/health-ping', authLimiter, requireApiKey, asyncHandler(async (req, res) => {
  const { agent_id } = req.params;

  const validation = driftValidator.validateHealthPing({ ...req.body, agent_id });
  if (!validation.valid) {
    throw new APIError('Validation failed', 400, validation.errors);
  }

  const result = await driftService.recordHealthPing(agent_id, req.body, req.apiKey);

  if (result.error) {
    const status = result.error === 'Agent not found' ? 404 : 400;
    throw new APIError(result.error, status);
  }

  logger.info('Health ping submitted', {
    agent_id,
    ping_id: result.ping_id,
    drift_score: result.drift_score,
  });

  res.status(201).json(result);
}));

/**
 * GET /:agent_id/drift-score
 * Get current drift status + trend + spike warnings.
 */
router.get('/:agent_id/drift-score', asyncHandler(async (req, res) => {
  const { agent_id } = req.params;

  const result = await driftService.getDriftScore(agent_id);

  res.json(result);
}));

/**
 * GET /:agent_id/drift-history
 * Get drift history with pagination, date range, sort, metric filter.
 * Query params: limit, offset, from, to, sort, metric, format
 */
router.get('/:agent_id/drift-history', asyncHandler(async (req, res) => {
  const { agent_id } = req.params;
  const { limit, offset, from, to, sort, metric, format } = req.query;

  const options = {
    limit: limit ? parseInt(limit, 10) : 20,
    offset: offset ? parseInt(offset, 10) : 0,
    from,
    to,
    sort: sort || 'desc',
    metric,
    format: format || 'json',
  };

  const result = await driftService.getDriftHistory(agent_id, options);

  if (result.csv) {
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename="${agent_id}_drift_history.csv"`);
    return res.send(result.csv);
  }

  res.json(result);
}));

/**
 * PUT /:agent_id/drift-config
 * Configure drift thresholds, weights, spike sensitivity.
 * Requires X-Api-Key.
 */
router.put('/:agent_id/drift-config', authLimiter, requireApiKey, asyncHandler(async (req, res) => {
  const { agent_id } = req.params;

  const validation = driftValidator.validateDriftConfig(req.body);
  if (!validation.valid) {
    throw new APIError('Validation failed', 400, validation.errors);
  }

  const result = await driftService.configureDrift(agent_id, req.body);

  logger.info('Drift config updated', { agent_id });

  res.json(result);
}));

/**
 * GET /:agent_id/drift-config
 * Get drift configuration for an agent.
 */
router.get('/:agent_id/drift-config', asyncHandler(async (req, res) => {
  const { agent_id } = req.params;

  const config = await driftService.getDriftConfig(agent_id);

  if (!config) {
    throw new APIError('Drift configuration not found', 404);
  }

  res.json(config);
}));

module.exports = router;
