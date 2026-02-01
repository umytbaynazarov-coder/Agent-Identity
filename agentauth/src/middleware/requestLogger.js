const logger = require('../config/logger');

/**
 * HTTP Request Logging Middleware
 * Logs all incoming requests with method, URL, IP, and response time
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  // Log request
  logger.http(`${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'http';

    logger.log(logLevel, `${req.method} ${req.url} ${res.statusCode}`, {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
    });
  });

  next();
}

module.exports = requestLogger;
