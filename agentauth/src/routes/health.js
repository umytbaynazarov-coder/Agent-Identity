const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const logger = require('../config/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (req, res) => {
  const health = {
    status: 'healthy',
    service: 'AgentAuth API',
    version: '0.5.0',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
    },
  };

  try {
    // Test database connectivity
    const { error } = await supabase
      .from('agents')
      .select('agent_id')
      .limit(1);

    if (error) {
      health.checks.database = 'unhealthy';
      health.status = 'degraded';
      logger.error('Health check - database error', { error: error.message });
    } else {
      health.checks.database = 'healthy';
    }
  } catch (err) {
    health.checks.database = 'unhealthy';
    health.status = 'unhealthy';
    logger.error('Health check - database exception', { error: err.message });
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;
