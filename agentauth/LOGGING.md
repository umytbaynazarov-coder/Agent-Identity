# Winston Logging Integration Guide

Winston structured logging has been configured for the AgentAuth backend. This guide explains how to integrate it into your application.

## What's Been Set Up

1. **Logger Configuration** (`src/config/logger.js`)
   - Production: JSON logs with file rotation (error.log, combined.log)
   - Development: Colorized console logs
   - Automatic exception and rejection handling

2. **HTTP Request Logger Middleware** (`src/middleware/requestLogger.js`)
   - Logs all HTTP requests with method, URL, IP, and response time
   - Automatically logs errors for 4xx/5xx responses

## Quick Integration

### Step 1: Add to server.js

Replace `console.log()` and `console.error()` with the logger:

```javascript
// At the top of server.js (after requires)
const logger = require('./src/config/logger');
const requestLogger = require('./src/middleware/requestLogger');

// Add HTTP request logging middleware (after CORS, before routes)
app.use(requestLogger);

// Replace console.log/error throughout the file:
// BEFORE:
console.log('Server started');
console.error('Database error:', error);

// AFTER:
logger.info('Server started');
logger.error('Database error:', { error: error.message, stack: error.stack });
```

### Step 2: Create logs directory

```bash
mkdir logs
```

### Step 3: Update .gitignore

Add to `.gitignore`:
```
logs/
*.log
```

## Usage Examples

### Basic Logging

```javascript
const logger = require('./src/config/logger');

// Different log levels
logger.error('Critical error occurred', { userId, errorCode });
logger.warn('Rate limit approaching', { agentId, requestCount });
logger.info('Agent registered successfully', { agentId, tier });
logger.http('HTTP request received', { method: 'POST', url: '/api/verify' });
logger.debug('Debug information', { variable: value });
```

### Logging in Routes

```javascript
// Success case
logger.info('Agent verified', {
  agent_id,
  tier,
  timestamp: new Date().toISOString()
});

// Error case
logger.error('Verification failed', {
  agent_id,
  reason: 'Invalid credentials',
  ip: req.ip
});
```

### Logging Database Operations

```javascript
try {
  const { data, error } = await supabase.from('agents').select('*');

  if (error) {
    logger.error('Database query failed', {
      table: 'agents',
      error: error.message,
      details: error.details
    });
  } else {
    logger.debug('Database query successful', {
      table: 'agents',
      rowCount: data.length
    });
  }
} catch (err) {
  logger.error('Database exception', {
    error: err.message,
    stack: err.stack
  });
}
```

## Log Levels

- **error**: Critical errors that need immediate attention
- **warn**: Warning messages (rate limits, deprecated features)
- **info**: General application flow (agent registered, tier updated)
- **http**: HTTP request/response logging
- **debug**: Detailed debugging information (development only)

## Production Considerations

### Log Rotation

Logs are automatically rotated:
- Maximum file size: 5MB
- Maximum files kept: 5
- Old logs are automatically deleted

### Log Files

- `logs/error.log` - Error level logs only
- `logs/combined.log` - All log levels
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

### Monitoring Integration

Winston logs are in JSON format for easy parsing by monitoring tools:

**Example log entry:**
```json
{
  "level": "error",
  "message": "Database query failed",
  "timestamp": "2025-01-31 02:30:15",
  "table": "agents",
  "error": "Connection timeout",
  "details": "..."
}
```

## Migration Checklist

- [ ] Import logger and requestLogger in server.js
- [ ] Add requestLogger middleware
- [ ] Replace all console.log with logger.info
- [ ] Replace all console.error with logger.error
- [ ] Replace all console.warn with logger.warn
- [ ] Create logs/ directory
- [ ] Add logs/ to .gitignore
- [ ] Test logging in development
- [ ] Verify log files in production
- [ ] Set up log monitoring (optional: Datadog, Sentry, etc.)

## Next Steps

After basic integration, consider:

1. **Structured Logging**: Add consistent metadata to all logs
2. **Correlation IDs**: Track requests across services
3. **External Logging Services**: Ship logs to Datadog, Sentry, or CloudWatch
4. **Performance Monitoring**: Track slow queries and API endpoints
5. **Alerting**: Set up alerts for error rate thresholds

## Testing

Test logging in development:

```bash
npm run dev

# Make some API requests
curl http://localhost:3000/health

# Check logs appear in console
# In production, check logs/ directory
```
