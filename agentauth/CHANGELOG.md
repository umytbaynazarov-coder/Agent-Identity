# Changelog

## [0.4.0] - 2026-01-29

### 🔥 Critical Fixes

- **Fixed memory leak** in rate limiting store - added automatic cleanup every 5 minutes
- **Fixed race condition** in rate limiting - check before increment
- **Fixed performance issue** - cache tier in JWT (eliminates DB query on every request)
- **Fixed missing indexes** in MIGRATION.sql (refresh_token_hash, webhook_endpoints, ip_address)
- **Fixed security issue** - removed real JWT_SECRET from .env.example

### 🎯 High Priority Improvements

- **Improved code organization** - moved middleware to top of file
- **Production CORS** - environment-aware CORS (localhost only in dev)
- **Enhanced test coverage** - added 7 new tests (refresh tokens, webhooks)
  - Total tests: 25 (up from 18)

### ✨ New Features

- **POST /agents/revoke-tokens** - Revoke all refresh tokens for an agent
- **POST /webhooks/:id/regenerate-secret** - Regenerate compromised webhook secrets
- **PUT /agents/:id/tier** - Update agent tier (admin only)
- **Enhanced pagination** - Activity logs now return full pagination metadata

### 🔧 Technical Improvements

- Eliminated unnecessary database queries in rate limiter
- Added cleanup mechanism for in-memory rate limit store
- Improved error handling and input validation
- Better TypeScript hints (reduced IDE warnings)

### 📊 Performance

- **-100% DB queries** in rate limiter (eliminated tier lookup)
- **+3 indexes** for faster queries
- **0 memory leaks** (fixed Map cleanup)

### 🛡️ Security

- Environment-aware CORS configuration
- Placeholder JWT_SECRET in examples
- Token revocation capability
- Webhook secret rotation

### 📚 Documentation

- Created FIXES_SUMMARY.md with detailed analysis
- Updated server startup banner
- Migration guide for existing installations

---

## [0.3.0] - Previous Version

- Webhook support
- Per-agent rate limiting with tiers
- Scoped permissions system
- Refresh token system

---

## Testing

Run tests with:

```bash
npm test
```

All 25 tests should pass, covering:

- Health checks
- Permission listing
- Agent registration (valid & invalid)
- Agent verification (valid & invalid)
- Refresh token flow
- Webhook management
- Permission enforcement
- Admin vs regular user access
