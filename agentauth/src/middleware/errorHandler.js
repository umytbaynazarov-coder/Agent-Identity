const logger = require('../config/logger');

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized error handling middleware
 * Catches all errors and returns consistent JSON responses
 */
function errorHandler(err, req, res, next) {
  // Default to 500 server error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.details || err.errors;
  }

  if (err.name === 'UnauthorizedError' || err.message === 'Not allowed by CORS') {
    statusCode = 401;
    message = err.message || 'Unauthorized';
  }

  if (err.code === 'PGRST116') {
    // Supabase "not found" error
    statusCode = 404;
    message = 'Resource not found';
  }

  if (err.code === '23505') {
    // PostgreSQL unique violation
    statusCode = 409;
    message = 'Resource already exists';
    details = 'Duplicate entry';
  }

  if (err.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Invalid reference';
    details = 'Referenced resource does not exist';
  }

  // Log error
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Error handled', {
    message: err.message,
    statusCode,
    stack: statusCode >= 500 ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Don't expose stack traces in production
  const response = {
    error: message,
    status: statusCode,
  };

  if (details) {
    response.details = details;
  }

  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * 404 Not Found handler
 * Catches all undefined routes
 */
function notFoundHandler(req, res) {
  logger.warn('Route not found', {
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    error: 'Route not found',
    status: 404,
    path: req.url,
  });
}

/**
 * Async route wrapper
 * Catches errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  APIError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
