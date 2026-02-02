const express = require('express');
const router = express.Router();
const agentService = require('../services/agentService');
const agentValidator = require('../validators/agentValidator');
const { authLimiter } = require('../middleware/rateLimiter');
const { APIError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * POST /agents/register
 * Register a new agent
 */
router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  // Validate input (async — persona validation loads trait allowlist)
  const validation = await agentValidator.validateRegistration(req.body);
  if (!validation.valid) {
    throw new APIError('Validation failed', 400, validation.errors);
  }

  // Register agent (persona is optional)
  const agent = await agentService.registerAgent(req.body);

  logger.info('Agent registered', {
    agent_id: agent.agent_id,
    name: agent.name,
    owner_email: agent.owner_email,
    has_persona: !!agent.persona,
  });

  const response = {
    agent_id: agent.agent_id,
    name: agent.name,
    owner_email: agent.owner_email,
    api_key: agent.api_key, // Only shown once
    tier: agent.tier || 'free',
    permissions: agent.permissions,
    created_at: agent.created_at,
  };

  if (agent.persona) {
    response.persona_version = agent.persona_version;
    response.persona_hash = agent.persona_hash;
  }

  res.status(201).json(response);
}));

/**
 * POST /agents/verify
 * Verify agent credentials
 */
router.post('/verify', authLimiter, asyncHandler(async (req, res) => {
  // Validate input
  const validation = agentValidator.validateVerification(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      valid: false,
      error: validation.errors[0]?.message || 'Validation failed',
    });
  }

  const { agent_id, api_key } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  // Verify credentials
  const agent = await agentService.verifyAgent(agent_id, api_key);

  if (!agent) {
    // Log failed verification
    await agentService.logVerification({
      agent_id,
      success: false,
      reason: 'Invalid credentials',
      ipAddress,
    });

    logger.warn('Agent verification failed', {
      agent_id,
      ip: ipAddress,
    });

    return res.status(401).json({
      valid: false,
      error: 'Invalid credentials',
    });
  }

  // Log successful verification
  await agentService.logVerification({
    agent_id,
    success: true,
    reason: 'Valid credentials',
    ipAddress,
  });

  logger.info('Agent verified', {
    agent_id,
    tier: agent.tier,
  });

  const verifyResponse = {
    valid: true,
    agent_id: agent.agent_id,
    name: agent.name,
    tier: agent.tier || 'free',
    permissions: agent.permissions,
    status: agent.status,
  };

  if (agent.persona_valid !== undefined) {
    verifyResponse.persona_valid = agent.persona_valid;
  }

  res.json(verifyResponse);
}));

/**
 * GET /agents
 * List all agents (admin only)
 */
router.get('/', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const status = req.query.status;

  const result = await agentService.listAgents({ limit, offset, status });

  res.json(result);
}));

/**
 * GET /agents/:agent_id
 * Get agent details
 */
router.get('/:agent_id', asyncHandler(async (req, res) => {
  const { agent_id } = req.params;

  const agent = await agentService.findAgentById(agent_id);

  if (!agent) {
    throw new APIError('Agent not found', 404);
  }

  // Don't expose sensitive data
  const { api_key_hash, ...safeAgent } = agent;

  res.json(safeAgent);
}));

/**
 * PUT /agents/:agent_id/tier
 * Update agent tier
 */
router.put('/:agent_id/tier', asyncHandler(async (req, res) => {
  const { agent_id } = req.params;
  const { tier } = req.body;

  // Validate tier
  const validation = agentValidator.validateTierUpdate(tier);
  if (!validation.valid) {
    throw new APIError('Validation failed', 400, validation.errors);
  }

  const agent = await agentService.updateAgentTier(agent_id, tier);

  logger.info('Agent tier updated', {
    agent_id,
    tier,
  });

  res.json({
    agent_id: agent.agent_id,
    tier: agent.tier,
    updated_at: agent.updated_at,
  });
}));

/**
 * PUT /agents/:agent_id/status
 * Update agent status
 */
router.put('/:agent_id/status', asyncHandler(async (req, res) => {
  const { agent_id } = req.params;
  const { status } = req.body;

  // Validate status
  const validation = agentValidator.validateStatusUpdate(status);
  if (!validation.valid) {
    throw new APIError('Validation failed', 400, validation.errors);
  }

  const agent = await agentService.updateAgentStatus(agent_id, status);

  logger.info('Agent status updated', {
    agent_id,
    status,
  });

  res.json({
    agent_id: agent.agent_id,
    status: agent.status,
    updated_at: agent.updated_at,
  });
}));

/**
 * PUT /agents/:agent_id/permissions
 * Update agent permissions
 */
router.put('/:agent_id/permissions', asyncHandler(async (req, res) => {
  const { agent_id } = req.params;
  const { permissions } = req.body;

  // Validate permissions
  const validation = agentValidator.validatePermissions(permissions);
  if (!validation.valid) {
    throw new APIError('Validation failed', 400, validation.errors);
  }

  const agent = await agentService.updateAgentPermissions(agent_id, permissions);

  logger.info('Agent permissions updated', {
    agent_id,
    permissions,
  });

  res.json({
    agent_id: agent.agent_id,
    permissions: agent.permissions,
    updated_at: agent.updated_at,
  });
}));

/**
 * DELETE /agents/:agent_id
 * Delete agent
 */
router.delete('/:agent_id', asyncHandler(async (req, res) => {
  const { agent_id } = req.params;

  await agentService.deleteAgent(agent_id);

  logger.info('Agent deleted', {
    agent_id,
  });

  res.json({
    success: true,
    message: 'Agent deleted successfully',
  });
}));

/**
 * GET /agents/:agent_id/activity
 * Get agent activity logs
 */
router.get('/:agent_id/activity', asyncHandler(async (req, res) => {
  const { agent_id } = req.params;
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  const result = await agentService.getAgentActivity(agent_id, { limit, offset });

  res.json(result);
}));

module.exports = router;
