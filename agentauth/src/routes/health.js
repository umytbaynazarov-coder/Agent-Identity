const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const logger = require('../config/logger');
const os = require('os');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Track server start time for uptime calculation
const serverStartTime = Date.now();

/**
 * GET /health
 * Basic health check endpoint for monitoring services
 * Returns: 200 (healthy), 503 (unhealthy/degraded)
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();

  const health = {
    status: 'healthy',
    service: 'AgentAuth API',
    version: '0.7.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - serverStartTime) / 1000), // seconds
    checks: {
      database: 'unknown',
      memory: 'unknown',
    },
  };

  try {
    // Test database connectivity with timeout
    const dbCheckStart = Date.now();
    const { error } = await supabase
      .from('agents')
      .select('agent_id')
      .limit(1);

    const dbResponseTime = Date.now() - dbCheckStart;

    if (error) {
      health.checks.database = 'unhealthy';
      health.status = 'degraded';
      logger.error('Health check - database error', { error: error.message });
    } else {
      health.checks.database = 'healthy';
      // Warn if database is slow (>1000ms is concerning)
      if (dbResponseTime > 1000) {
        health.checks.database = 'degraded';
        health.status = 'degraded';
        logger.warn('Health check - slow database response', { responseTime: dbResponseTime });
      }
    }
  } catch (err) {
    health.checks.database = 'unhealthy';
    health.status = 'unhealthy';
    logger.error('Health check - database exception', { error: err.message });
  }

  // Check memory usage
  try {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMemPercent = ((totalMem - freeMem) / totalMem) * 100;

    // Warn if using >512MB heap or >80% system memory
    if (memUsage.heapUsed > 512 * 1024 * 1024 || usedMemPercent > 80) {
      health.checks.memory = 'degraded';
      if (health.status === 'healthy') {
        health.status = 'degraded';
      }
      logger.warn('Health check - high memory usage', {
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        systemUsedPercent: Math.round(usedMemPercent),
      });
    } else {
      health.checks.memory = 'healthy';
    }
  } catch (err) {
    health.checks.memory = 'unknown';
    logger.error('Health check - memory check failed', { error: err.message });
  }

  // Add response time
  health.responseTime = Date.now() - startTime;

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * GET /health/detailed
 * Detailed health check for debugging (more verbose)
 */
router.get('/detailed', async (req, res) => {
  const startTime = Date.now();

  const health = {
    status: 'healthy',
    service: 'AgentAuth API',
    version: '0.7.0',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor((Date.now() - serverStartTime) / 1000),
      human: formatUptime(Date.now() - serverStartTime),
    },
    checks: {},
  };

  // Database check with timing
  try {
    const dbCheckStart = Date.now();
    const { data, error } = await supabase
      .from('agents')
      .select('agent_id')
      .limit(1);

    const dbResponseTime = Date.now() - dbCheckStart;

    health.checks.database = {
      status: error ? 'unhealthy' : 'healthy',
      responseTime: dbResponseTime,
      connected: !error,
      error: error ? error.message : null,
    };

    if (error || dbResponseTime > 1000) {
      health.status = 'degraded';
    }
  } catch (err) {
    health.checks.database = {
      status: 'unhealthy',
      error: err.message,
      connected: false,
    };
    health.status = 'unhealthy';
  }

  // Memory check (detailed)
  try {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    health.checks.memory = {
      status: 'healthy',
      process: {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
      },
      system: {
        total: `${Math.round(totalMem / 1024 / 1024)} MB`,
        free: `${Math.round(freeMem / 1024 / 1024)} MB`,
        used: `${Math.round(usedMem / 1024 / 1024)} MB`,
        usedPercent: `${Math.round((usedMem / totalMem) * 100)}%`,
      },
    };

    // Mark as degraded if memory is high
    if (memUsage.heapUsed > 512 * 1024 * 1024 || (usedMem / totalMem) > 0.8) {
      health.checks.memory.status = 'degraded';
      if (health.status === 'healthy') {
        health.status = 'degraded';
      }
    }
  } catch (err) {
    health.checks.memory = {
      status: 'error',
      error: err.message,
    };
  }

  // System info
  try {
    health.system = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpus: os.cpus().length,
      loadAverage: os.loadavg(),
      hostname: os.hostname(),
    };
  } catch (err) {
    health.system = {
      error: err.message,
    };
  }

  // Environment info (non-sensitive)
  health.environment = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
  };

  // Response time
  health.responseTime = Date.now() - startTime;

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Format uptime in human-readable format
 */
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

module.exports = router;
