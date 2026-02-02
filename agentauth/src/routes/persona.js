const express = require('express');
const router = express.Router({ mergeParams: true });
const personaService = require('../services/personaService');
const personaValidator = require('../validators/personaValidator');
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
 * POST /:agent_id/persona
 * Register a new persona for the agent.
 */
router.post('/', authLimiter, asyncHandler(requireApiKey), asyncHandler(async (req, res) => {
  const { agent_id } = req.params;
  const { persona } = req.body;

  if (!persona) {
    throw new APIError('Persona object is required', 400);
  }

  // Check if agent already has a persona
  const existing = await personaService.getPersona(agent_id);
  if (existing) {
    throw new APIError('Persona already registered. Use PUT to update.', 409);
  }

  // Validate
  const validation = await personaValidator.validatePersona(persona);
  if (!validation.valid) {
    throw new APIError(
      'Persona validation failed',
      validation.statusCode || 400,
      validation.errors
    );
  }

  const result = await personaService.registerPersona(agent_id, persona, req.apiKey);

  logger.info('Persona registered', { agent_id, version: result.persona_version });

  res.status(201).json(result);
}));

/**
 * GET /:agent_id/persona
 * Get the agent's persona. ?include_prompt=true to generate system prompt.
 */
router.get('/', asyncHandler(async (req, res) => {
  const { agent_id } = req.params;
  const includePrompt = req.query.include_prompt === 'true';

  const result = await personaService.getPersona(agent_id, { includePrompt });

  if (!result) {
    throw new APIError('No persona registered for this agent', 404);
  }

  // Set ETag for caching
  res.set('ETag', `"${result.etag}"`);

  // Check If-None-Match for conditional GET
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && ifNoneMatch === `"${result.etag}"`) {
    return res.status(304).end();
  }

  res.json(result);
}));

/**
 * GET /:agent_id/persona/history
 * Paginated persona version history.
 */
router.get('/history', asyncHandler(async (req, res) => {
  const { agent_id } = req.params;
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  const sort = req.query.sort === 'asc' ? 'asc' : 'desc';
  const format = req.query.format === 'csv' ? 'csv' : 'json';

  const result = await personaService.getPersonaHistory(agent_id, { limit, offset, sort, format });

  if (format === 'csv') {
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename="${agent_id}_persona_history.csv"`);
    return res.send(result.csv);
  }

  res.json(result);
}));

/**
 * PUT /:agent_id/persona
 * Update persona (auto version bump, fires persona.updated webhook).
 */
router.put('/', authLimiter, asyncHandler(requireApiKey), asyncHandler(async (req, res) => {
  const { agent_id } = req.params;
  const { persona } = req.body;

  if (!persona) {
    throw new APIError('Persona object is required', 400);
  }

  // Validate
  const validation = await personaValidator.validatePersona(persona);
  if (!validation.valid) {
    throw new APIError(
      'Persona validation failed',
      validation.statusCode || 400,
      validation.errors
    );
  }

  const result = await personaService.updatePersona(agent_id, persona, req.apiKey);

  logger.info('Persona updated', {
    agent_id,
    version: result.persona_version,
    previous_version: result.previous_version,
  });

  res.json(result);
}));

/**
 * POST /:agent_id/persona/verify
 * Verify persona integrity (hash check).
 */
router.post('/verify', authLimiter, asyncHandler(requireApiKey), asyncHandler(async (req, res) => {
  const { agent_id } = req.params;

  const result = await personaService.verifyPersonaIntegrity(agent_id, req.apiKey);

  logger.info('Persona integrity check', { agent_id, valid: result.valid });

  res.json(result);
}));

/**
 * GET /:agent_id/persona/export
 * Export persona + history as signed ZIP.
 */
router.get('/export', asyncHandler(async (req, res) => {
  const { agent_id } = req.params;

  const result = await personaService.exportPersona(agent_id);

  if (!result) {
    throw new APIError('No persona registered for this agent', 404);
  }

  res.set('Content-Type', 'application/zip');
  res.set('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.set('X-Bundle-Signature', result.signature);

  result.stream.pipe(res);
}));

/**
 * POST /:agent_id/persona/import
 * Import and validate a shared persona bundle.
 */
router.post('/import', authLimiter, asyncHandler(requireApiKey), asyncHandler(async (req, res) => {
  const { agent_id } = req.params;
  const { bundle } = req.body;

  if (!bundle) {
    throw new APIError('Bundle object is required', 400);
  }

  const result = await personaService.importPersona(agent_id, bundle, req.apiKey);

  logger.info('Persona imported', { agent_id, version: result.persona_version });

  res.status(201).json(result);
}));

module.exports = router;
