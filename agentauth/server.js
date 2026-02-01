const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import middleware
const logger = require('./src/config/logger');
const requestLogger = require('./src/middleware/requestLogger');
const { generalLimiter } = require('./src/middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

// Import routes
const healthRoutes = require('./src/routes/health');
const agentRoutes = require('./src/routes/agents');
const webhookRoutes = require('./src/routes/webhooks');
const apiDocsRoutes = require('./src/routes/apiDocs');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// ENVIRONMENT VALIDATION
// ============================================
function validateEnvironment() {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    logger.error('Missing required environment variables', { missing });
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    console.error('See .env.example for reference.\n');
    process.exit(1);
  }
}

validateEnvironment();

// ============================================
// CORS CONFIGURATION
// ============================================
const allowedOrigins = [
  'https://agentauths.com',
  'https://www.agentauths.com',
  'https://agentauth-dashboard-production.up.railway.app',
  'https://agent-identity-production.up.railway.app',
];

// Add localhost origins in development
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(
    'http://localhost:3000',
    'http://localhost:5173', // Vite dashboard
    'http://localhost:5500',
    'http://localhost:8080',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5173'
  );
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
};

// ============================================
// MIDDLEWARE
// ============================================

// CORS
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Body parsing with size limits (DoS protection)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(requestLogger);

// Rate limiting
app.use(generalLimiter);

// ============================================
// ROUTES - API v1
// ============================================

// Health check (no versioning for monitoring)
app.use('/health', healthRoutes);

// API Documentation (Swagger UI)
app.use('/api-docs', apiDocsRoutes);

// API v1 routes
app.use('/v1/agents', agentRoutes);
app.use('/v1/webhooks', webhookRoutes);

// Legacy routes (backwards compatibility - redirect to v1)
app.use('/agents', (req, _res, next) => {
  logger.warn('Legacy route used', { path: req.path, method: req.method });
  req.url = '/v1' + req.url;
  next();
}, agentRoutes);

app.use('/webhooks', (req, _res, next) => {
  logger.warn('Legacy route used', { path: req.path, method: req.method });
  req.url = '/v1' + req.url;
  next();
}, webhookRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

const server = app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    version: '0.5.0',
  });

  console.log(`
╔════════════════════════════════════════════════════╗
║         AgentAuth API v0.5.0                       ║
║         Refactored & Production-Ready              ║
╠════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                       ║
║                                                    ║
║  📚 API Documentation:                             ║
║  • http://localhost:${PORT}/api-docs               ║
║                                                    ║
║  Core Endpoints (v1):                              ║
║  • GET  /health                 Health check       ║
║  • POST /v1/agents/register     Register agent     ║
║  • POST /v1/agents/verify       Verify agent       ║
║  • GET  /v1/agents              List agents        ║
║  • PUT  /v1/agents/:id/tier     Update tier        ║
║  • POST /v1/webhooks            Create webhook     ║
║  • GET  /v1/webhooks/events     List events        ║
║                                                    ║
║  Features:                                         ║
║  • Modular architecture with services/routes       ║
║  • Centralized error handling                      ║
║  • Winston structured logging                      ║
║  • API versioning (v1)                             ║
║  • Rate limiting & CORS protection                 ║
║  • Interactive API docs (Swagger UI)               ║
╚════════════════════════════════════════════════════╝
  `);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

function gracefulShutdown(signal) {
  logger.info('Graceful shutdown initiated', { signal });

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', {
    error: err.message,
    stack: err.stack,
  });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;
