const jwt = require('jsonwebtoken');
const { APIError, asyncHandler } = require('./errorHandler');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * JWT Authentication Middleware
 * Verifies JWT token in Authorization header
 * Adds decoded payload to req.agent
 */
const authenticateJWT = asyncHandler(async (req, res, next) => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn('Missing Authorization header', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    throw new APIError('Missing Authorization header', 401);
  }

  if (!authHeader.startsWith('Bearer ')) {
    logger.warn('Invalid Authorization format', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    throw new APIError('Authorization header must use Bearer scheme', 401);
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  if (!token) {
    throw new APIError('Missing JWT token', 401);
  }

  try {
    // Verify JWT token
    const payload = jwt.verify(token, JWT_SECRET);

    // Check if it's a refresh token (should not be used for API access)
    if (payload.type === 'refresh') {
      logger.warn('Refresh token used for API access', {
        agent_id: payload.agent_id,
        path: req.path,
        method: req.method,
      });
      throw new APIError('Invalid token type. Use access token, not refresh token.', 401);
    }

    // Attach agent info to request
    req.agent = {
      agent_id: payload.agent_id,
      tier: payload.tier,
    };

    logger.debug('JWT authenticated', {
      agent_id: payload.agent_id,
      tier: payload.tier,
      path: req.path,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token', {
        error: error.message,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      throw new APIError('Invalid token', 401);
    }

    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired JWT token', {
        expired_at: error.expiredAt,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      throw new APIError('Token expired', 401);
    }

    // Re-throw APIError instances
    if (error instanceof APIError) {
      throw error;
    }

    // Unexpected error
    logger.error('JWT verification error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
    });
    throw new APIError('Authentication failed', 500);
  }
});

/**
 * Optional JWT Authentication
 * Same as authenticateJWT but doesn't fail if no token provided
 * Useful for endpoints that have different behavior for authenticated vs anonymous users
 */
const optionalAuthenticateJWT = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without authentication
    req.agent = null;
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (payload.type !== 'refresh') {
      req.agent = {
        agent_id: payload.agent_id,
        tier: payload.tier,
      };
    }
  } catch {
    // Invalid token, but don't fail - just continue as anonymous
    req.agent = null;
  }

  next();
});

/**
 * Flexible Authentication Middleware
 * Accepts EITHER JWT (Bearer token) OR API Key (X-Api-Key header)
 * Used for endpoints that support both dashboard (JWT) and SDK (API key) access
 */
const agentService = require('../services/agentService');

const authenticateFlexible = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  // Try JWT first (Bearer token)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const payload = jwt.verify(token, JWT_SECRET);

      if (payload.type === 'refresh') {
        throw new APIError('Invalid token type. Use access token, not refresh token.', 401);
      }

      req.agent = {
        agent_id: payload.agent_id,
        tier: payload.tier,
      };

      logger.debug('JWT authenticated (flexible)', {
        agent_id: payload.agent_id,
        path: req.path,
      });

      return next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        throw new APIError('Invalid or expired token', 401);
      }
      throw error;
    }
  }

  // Try API Key (X-Api-Key header)
  if (apiKey) {
    const { agent_id } = req.params;

    if (!agent_id) {
      throw new APIError('agent_id parameter required for API key authentication', 400);
    }

    const agent = await agentService.verifyAgent(agent_id, apiKey);

    if (!agent) {
      throw new APIError('Invalid API key or agent not found', 401);
    }

    req.agent = agent;
    req.apiKey = apiKey;

    logger.debug('API key authenticated (flexible)', {
      agent_id,
      path: req.path,
    });

    return next();
  }

  // No valid authentication provided
  logger.warn('No valid authentication provided', {
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  throw new APIError('Authentication required. Provide either Bearer token or X-Api-Key header.', 401);
});

module.exports = {
  authenticateJWT,
  optionalAuthenticateJWT,
  authenticateFlexible,
};
