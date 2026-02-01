const express = require('express');
const router = express.Router();
const webhookService = require('../services/webhookService');
const webhookValidator = require('../validators/webhookValidator');
const { APIError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * POST /webhooks
 * Create a new webhook
 */
router.post('/', asyncHandler(async (req, res) => {
  // Validate input
  const validation = webhookValidator.validateWebhookCreation(req.body);
  if (!validation.valid) {
    throw new APIError('Validation failed', 400, validation.errors);
  }

  // Create webhook
  const webhook = await webhookService.createWebhook(req.body);

  logger.info('Webhook created', {
    webhook_id: webhook.id,
    agent_id: webhook.agent_id,
    url: webhook.url,
  });

  res.status(201).json(webhook);
}));

/**
 * GET /webhooks
 * List webhooks for an agent
 */
router.get('/', asyncHandler(async (req, res) => {
  const { agent_id } = req.query;

  if (!agent_id) {
    throw new APIError('agent_id query parameter is required', 400);
  }

  const webhooks = await webhookService.listWebhooks(agent_id);

  res.json({ webhooks });
}));

/**
 * GET /webhooks/events
 * List available webhook events
 */
router.get('/events', (req, res) => {
  res.json({
    events: webhookValidator.AVAILABLE_EVENTS,
  });
});

/**
 * GET /webhooks/:webhook_id
 * Get webhook details
 */
router.get('/:webhook_id', asyncHandler(async (req, res) => {
  const { webhook_id } = req.params;

  const webhook = await webhookService.getWebhookById(webhook_id);

  if (!webhook) {
    throw new APIError('Webhook not found', 404);
  }

  res.json(webhook);
}));

/**
 * PUT /webhooks/:webhook_id
 * Update webhook
 */
router.put('/:webhook_id', asyncHandler(async (req, res) => {
  const { webhook_id } = req.params;

  // Validate input
  const validation = webhookValidator.validateWebhookUpdate(req.body);
  if (!validation.valid) {
    throw new APIError('Validation failed', 400, validation.errors);
  }

  const webhook = await webhookService.updateWebhook(webhook_id, req.body);

  logger.info('Webhook updated', {
    webhook_id,
    agent_id: webhook.agent_id,
  });

  res.json(webhook);
}));

/**
 * DELETE /webhooks/:webhook_id
 * Delete webhook
 */
router.delete('/:webhook_id', asyncHandler(async (req, res) => {
  const { webhook_id } = req.params;

  await webhookService.deleteWebhook(webhook_id);

  logger.info('Webhook deleted', {
    webhook_id,
  });

  res.json({
    success: true,
    message: 'Webhook deleted successfully',
  });
}));

/**
 * POST /webhooks/:webhook_id/regenerate-secret
 * Regenerate webhook secret
 */
router.post('/:webhook_id/regenerate-secret', asyncHandler(async (req, res) => {
  const { webhook_id } = req.params;

  const webhook = await webhookService.regenerateWebhookSecret(webhook_id);

  logger.info('Webhook secret regenerated', {
    webhook_id,
    agent_id: webhook.agent_id,
  });

  res.json({
    webhook_id: webhook.id,
    secret: webhook.secret,
    message: 'Secret regenerated successfully',
  });
}));

/**
 * POST /webhooks/:webhook_id/toggle
 * Toggle webhook active status
 */
router.post('/:webhook_id/toggle', asyncHandler(async (req, res) => {
  const { webhook_id } = req.params;
  const { is_active } = req.body;

  if (typeof is_active !== 'boolean') {
    throw new APIError('is_active must be a boolean', 400);
  }

  const webhook = await webhookService.toggleWebhook(webhook_id, is_active);

  logger.info('Webhook toggled', {
    webhook_id,
    is_active,
  });

  res.json(webhook);
}));

/**
 * GET /webhooks/:webhook_id/deliveries
 * Get webhook delivery history
 */
router.get('/:webhook_id/deliveries', asyncHandler(async (req, res) => {
  const { webhook_id } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  const result = await webhookService.getWebhookDeliveries(webhook_id, { limit, offset });

  res.json(result);
}));

module.exports = router;
