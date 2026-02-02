const express = require('express');
const router = express.Router();
const zkpService = require('../services/zkpService');
const zkpValidator = require('../validators/zkpValidator');
const agentService = require('../services/agentService');
const { authLimiter } = require('../middleware/rateLimiter');
const { APIError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * POST /v1/zkp/register-commitment
 * Generate and store a ZKP commitment for an agent.
 * Requires agent_id + api_key in body. Optional expires_in (seconds).
 */
router.post('/register-commitment', authLimiter, asyncHandler(async (req, res) => {
  // Validate input
  const validation = zkpValidator.validateCommitmentRegistration(req.body);
  if (!validation.valid) {
    throw new APIError('Validation failed', 400, validation.errors);
  }

  const { agent_id, api_key, expires_in } = req.body;

  // Verify agent credentials first
  const agent = await agentService.verifyAgent(agent_id, api_key);
  if (!agent) {
    throw new APIError('Invalid agent credentials', 401);
  }

  const result = await zkpService.registerCommitment(
    agent_id,
    api_key,
    agent.permissions,
    agent.tier,
    expires_in
  );

  logger.info('ZKP commitment registered', {
    agent_id,
    commitment: result.commitment.substring(0, 16) + '...',
    expires_at: result.expires_at,
  });

  res.status(201).json({
    commitment: result.commitment,
    salt: result.salt, // Only returned once
    expires_at: result.expires_at,
    message: 'Store the salt securely — it will not be shown again.',
  });
}));

/**
 * POST /v1/zkp/verify-anonymous
 * Verify a commitment anonymously. ?mode=zkp (default) or ?mode=hash
 * No-store cache control to prevent caching of verification results.
 */
router.post('/verify-anonymous', authLimiter, asyncHandler(async (req, res) => {
  // Validate input (may throw ZKPModeError)
  const mode = req.body.mode || req.query.mode || 'zkp';
  const validation = zkpValidator.validateAnonymousVerification({
    ...req.body,
    mode,
  });

  if (!validation.valid) {
    throw new APIError('Validation failed', 400, validation.errors);
  }

  const { commitment, proof, publicSignals, preimage_hash } = req.body;

  const proofData = mode === 'zkp'
    ? { proof, publicSignals }
    : { preimage_hash };

  const result = await zkpService.verifyAnonymous(commitment, proofData, mode);

  logger.info('ZKP anonymous verification attempt', {
    commitment: commitment.substring(0, 16) + '...',
    mode,
    valid: result.valid,
  });

  // Prevent caching of verification responses
  res.set('Cache-Control', 'no-store');

  if (!result.valid) {
    return res.status(401).json(result);
  }

  res.json(result);
}));

/**
 * DELETE /v1/zkp/commitment/:commitment
 * Revoke a commitment.
 */
router.delete('/commitment/:commitment', authLimiter, asyncHandler(async (req, res) => {
  const { commitment } = req.params;

  const result = await zkpService.revokeCommitment(commitment);

  if (!result) {
    throw new APIError('Commitment not found or already revoked', 404);
  }

  logger.info('ZKP commitment revoked', {
    commitment: commitment.substring(0, 16) + '...',
  });

  res.json({
    success: true,
    commitment: result.commitment,
    status: 'revoked',
  });
}));

/**
 * GET /v1/zkp/active-count
 * Admin: count of active (non-expired, non-revoked) commitments.
 * Uses the active_commitments view.
 */
router.get('/active-count', asyncHandler(async (_req, res) => {
  const { count, error } = await require('@supabase/supabase-js')
    .createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
    .from('active_commitments')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;

  res.json({ active_commitments: count });
}));

module.exports = router;
