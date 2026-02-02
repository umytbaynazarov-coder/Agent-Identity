# Changelog

## [0.7.0] - 2026-02-01

### "Soul Layer" — Agent Identity, Integrity & Behavioral Trust

v0.7.0 adds three pillars of agent identity: **Persona** (digital soul), **ZKP** (anonymous verification), and **Anti-Drift Vault** (behavioral monitoring). This release also includes comprehensive test coverage (219 passing tests) and full API documentation with OpenAPI spec updated to 35 endpoints.

---

### 🧬 Persona System (Digital Soul)

- **Register, retrieve, update** agent personas with HMAC-SHA256 signing
- **Persona validator**: semver version, personality traits (0-1 range + allowed strings), guardrails, constraints
- **Canonicalization** for deterministic hashing (sorted keys, float rounding)
- **Auto-bumped** semver versioning on update
- **Version history** tracking
- **ZIP export/import** for persona bundles
- **Generated system prompt** templates from persona data
- **ETag-based caching** (304 Not Modified)
- **CSV export** for history
- **New webhook events**: `persona.created`, `persona.updated`

### 🔐 ZKP Anonymous Verification

- **SHA-256 commitment** generation from agent credentials
- **Hash mode**: fast preimage-based verification
- **ZKP mode**: Groth16 proof verification via snarkjs
- **Commitment TTL** with auto-expiry
- **Commitment revocation**
- **Verification key caching**
- **Concurrent cleanup** throttling

### 🛡️ Anti-Drift Vault

- **Health ping ingestion** with metric validation
- **Weighted drift score** calculation (0.0-1.0)
- **Standard deviation-based** spike detection with LRU cache
- **Configurable thresholds** (warning + drift)
- **Auto-revoke** capability
- **HMAC ping signature** verification
- **Drift history** with pagination and CSV export
- **Single-metric filtering**
- **New webhook events**: `agent.drift.warning`, `agent.drift.revoked`

### 🖥️ Dashboard Updates

- **Persona Manager** page (JSON editor, integrity verification, version history, export)
- **Anti-Drift** page (drift gauge, health ping history, threshold configuration)
- **New TypeScript types** for persona and drift
- **New API client modules**

### 📦 SDK Updates

- **TypeScript SDK**: 15 new methods (persona, ZKP, drift)
- **Python SDK**: 15 new methods with type hints
- Both SDKs bumped to **0.7.0**

### 🧪 Testing (Phase 7)

- **219 passing tests** (up from 56)
- **Integration tests**: persona (21), ZKP (21), drift (22)
- **Unit tests**: personaService (31), driftService (23), zkpService (22)
- **Performance benchmarks**: ZKP latency (<500ms), drift score under load
- **Snapshot tests**: 4 webhook payload snapshots
- **E2E test placeholders** for future Cypress/Playwright

### 📚 Documentation (Phase 8)

- **OpenAPI spec** updated to v0.7.0 (2,274 lines, 35 endpoints)
- **API reference** with cURL/JS/Python examples
- **Persona JSON schema** reference
- **ZKP client-side proof** generation guide
- **"Build a Drift-Proof Agent in 5 Steps"** quickstart
- **Versioned docs** hosting (`/docs/v0.7.0/api`)

### 🗄️ Database Migration

- **New tables**: `persona_registry`, `persona_history`, `zkp_commitments`, `drift_health_pings`, `drift_config`
- **New columns on agents**: `persona_hash`, `persona_version`, `drift_score`, `drift_status`
- **Triggers** for auto-history tracking
- **Materialized view**: `agent_trust_scores`
- **Row-level security** policies
- **Performance indexes**

---

### 🔄 Migration Guide: v0.6 → v0.7

#### Database

```sql
-- Run the Soul Layer migration
psql -f migrations/002_soul_layer.sql
```

#### New Dependencies

```bash
npm install semver deep-diff archiver lru-cache snarkjs
```

#### New Environment Variables

None required. `PERSONA_SECRET` defaults to `JWT_SECRET` if not set.

#### New Endpoints (16 total)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/agents/:id/persona` | Register agent persona |
| `GET` | `/v1/agents/:id/persona` | Get agent persona |
| `PUT` | `/v1/agents/:id/persona` | Update agent persona |
| `GET` | `/v1/agents/:id/persona/history` | Get persona version history |
| `GET` | `/v1/agents/:id/persona/export` | Export persona as ZIP bundle |
| `POST` | `/v1/agents/:id/persona/import` | Import persona from ZIP bundle |
| `GET` | `/v1/agents/:id/persona/prompt` | Generate system prompt from persona |
| `POST` | `/v1/zkp/commit` | Create ZKP commitment |
| `POST` | `/v1/zkp/verify` | Verify ZKP commitment |
| `DELETE` | `/v1/zkp/commit/:id` | Revoke commitment |
| `POST` | `/v1/agents/:id/drift/ping` | Submit health ping |
| `GET` | `/v1/agents/:id/drift/score` | Get current drift score |
| `GET` | `/v1/agents/:id/drift/history` | Get drift history |
| `GET` | `/v1/agents/:id/drift/config` | Get drift configuration |
| `PUT` | `/v1/agents/:id/drift/config` | Update drift configuration |
| `GET` | `/v1/agents/:id/drift/export` | Export drift history as CSV |

#### Webhook Events

New events to subscribe to:
- `persona.created` — Fired when an agent persona is registered
- `persona.updated` — Fired when an agent persona is updated
- `agent.drift.warning` — Fired when drift score exceeds warning threshold
- `agent.drift.revoked` — Fired when drift score triggers auto-revocation

#### SDK Updates

```bash
# TypeScript
npm install @agentauth/sdk@0.7.0

# Python
pip install agentauth==0.7.0
```

---

### 📦 Dependencies Added

- `semver` ^7.7.3
- `deep-diff` ^1.0.2
- `archiver` ^7.0.1
- `lru-cache` ^11.2.5
- `snarkjs` ^0.7.6

### ✅ Quality Assurance

- **245 total tests** (219 passing, 26 skipped placeholders)
- **4 snapshot tests**
- All integration, unit, performance tests green
- OpenAPI spec validated

---

## [0.6.0] - 2026-02-01

### 📊 Production-Ready Operations & Enterprise Trust

This release focuses on **operational excellence** and **trust signals** for enterprise adoption. AgentAuth now has comprehensive documentation, live monitoring, and legal compliance - everything needed for production deployments.

---

### 📚 API Documentation

#### **Interactive API Documentation**
- **Swagger UI** at `/api-docs` endpoint
- Try out API endpoints directly in browser
- Environment selector (production vs local)
- Persistent authorization for testing

#### **OpenAPI 3.1 Specification**
- Complete machine-readable API spec (1,100+ lines)
- Documents all 19 endpoints
- Request/response schemas
- Authentication flows
- Rate limit headers
- Error responses (400, 401, 403, 404, 429, 500, 503)
- Webhook event types and payload schemas

#### **API Reference Documentation**
- [docs/api-reference.md](docs/api-reference.md) (800+ lines)
- Code examples in 3 languages (cURL, JavaScript, Python)
- Authentication guide
- Rate limiting documentation
- Error handling reference
- Webhook integration examples

---

### 🔍 Enhanced Health Monitoring

#### **Basic Health Check** (`GET /health`)
- Database connectivity check with response time tracking
- Memory usage monitoring (alerts at >512MB or >80% system memory)
- Uptime tracking (seconds since start)
- Response time measurement
- Returns 200 (healthy) or 503 (degraded/unhealthy)

#### **Detailed Health Check** (`GET /health/detailed`)
- Comprehensive database metrics (connection status, response time)
- Process memory breakdown (heap, RSS, external memory)
- System memory stats (total, free, used %)
- System information (platform, arch, Node version, CPUs, load average)
- Environment info (non-sensitive)
- Human-readable uptime format

---

### 📈 Live Monitoring & Status Page

#### **BetterStack Integration**
- 3 active monitors:
  - API Health (`/health`) - checks every 5 minutes
  - Dashboard - checks every 5 minutes
  - Database Health (validates `$.checks.database`) - checks every 10 minutes
- Email alerts on incidents
- Public status page: [agentauths.betteruptime.com](https://agentauths.betteruptime.com/)

#### **Status Page Setup Guide**
- [docs/status-page-setup.md](docs/status-page-setup.md) (500+ lines)
- Comprehensive guides for 3 monitoring services:
  - **BetterStack** (recommended - free tier, 10 monitors)
  - **Uptime Robot** (50 free monitors)
  - **StatusPage.io** (enterprise, $29/month)
- Custom domain setup (status.agentauth.dev)
- Discord webhook integration
- Email alerting configuration
- Status badge setup
- Monitoring best practices

---

### 🎯 SLA & Operational Commitment

#### **Service Level Agreement**
- [docs/sla.md](docs/sla.md) (400+ lines)
- **99.9% uptime target** (max 43 min downtime/month)
- Incident response process (Detection → Investigation → Fix → Postmortem)
- Severity levels with response times:
  - P0-Critical: <15 min
  - P1-High: <1 hour
  - P2-Medium: <4 hours
  - P3-Low: <24 hours
- Performance targets (p50 <50ms, p95 <100ms, p99 <200ms)
- SLA credits for managed service (10-100% refund based on downtime)
- Self-hosted vs Managed service SLA differences

#### **Public Incident Log**
- [docs/incidents.md](docs/incidents.md) (300+ lines)
- Incident report template with timeline, root cause, resolution, prevention
- Example incident walkthrough (fictional) showing transparency format
- Incident statistics tracking
- Trust-building through radical transparency

---

### 📖 Deployment Documentation

#### **Platform-Specific Guides** ([docs/deployment/](docs/deployment/))
- **Railway** - Step-by-step deployment to Railway ($5-10/month)
- **Render** - One-click deploy with Blueprint config (free tier available)
- **DigitalOcean** - App Platform deployment ($12/month starter)
- **Docker Compose** - Self-hosted with HTTPS, nginx, Let's Encrypt

#### **Deployment Overview**
- [docs/deployment/README.md](docs/deployment/README.md)
- Decision tree for choosing platform
- Cost comparisons
- Migration guides between platforms
- High availability setup

---

### 📜 Legal & Security Documentation

#### **Security**
- [SECURITY.md](SECURITY.md)
- Vulnerability disclosure policy
- Security contact: security@agentauth.dev
- Supported versions
- Response timeline (24-48h acknowledgment, 7 days fix)
- Hall of Fame for security researchers

#### **Contributing**
- [CONTRIBUTING.md](CONTRIBUTING.md)
- How to run locally (`docker-compose up`)
- How to run tests (`npm test`)
- Code style guide (ESLint + Prettier)
- Commit message format (Conventional Commits)
- PR process

#### **Code of Conduct**
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Contributor Covenant template
- Enforcement contact: conduct@agentauth.dev

#### **Terms of Service & Privacy Policy**
- [docs/legal/terms.md](docs/legal/terms.md)
- [docs/legal/privacy.md](docs/legal/privacy.md)
- Acceptable use policy
- Data ownership (user owns all data)
- GDPR compliance (access, export, delete rights)
- No tracking, no analytics by default

---

### 🛠️ Technical Improvements

#### **Repository Organization**
- Added MIT LICENSE to repository root
- GitHub issue templates (bug report, feature request)
- Pull request template
- Security policy in GitHub settings
- Professional README badges

#### **Dashboard Fixes**
- Fixed Railway health check path (from `/health` to `/`)
- Dashboard now accessible at [agent-identity-production.up.railway.app](https://agent-identity-production.up.railway.app)
- nginx configuration optimized for static SPA serving

---

### 📊 Week 4 Completion: Critical Trust Signals

All tasks from the 90-day roadmap Week 4 completed:
- ✅ LICENSE, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md
- ✅ Terms of Service + Privacy Policy
- ✅ Deployment guides for 4 platforms
- ✅ OpenAPI spec + Swagger UI
- ✅ Status page operational (agentauths.betteruptime.com)
- ✅ SLA commitment documented (99.9% uptime)
- ✅ Incident transparency process defined
- ✅ 0 legal/security blockers for enterprise adoption

---

### 🚀 What's Next: Week 5 - Beta Expansion

Focus shifts to user validation and community building:
- Beta user recruitment (target: 50+ active users)
- Onboarding optimization (time to first deployment <15 min)
- Feedback collection and feature prioritization
- Testimonials and case studies
- NPS tracking and user satisfaction

---

## [0.5.0] - 2026-01-31

### 🚀 Major Release: Production-Grade Architecture & Performance

This release represents a **complete transformation** of the AgentAuth platform with backend refactoring and frontend optimization. The system is now production-ready with enterprise-grade architecture, comprehensive testing, and stellar performance.

---

### 🏗️ Backend Architecture Refactoring (Phase 3)

#### **87% Code Reduction in server.js**
- Reduced from **1,590 lines → 208 lines** (87% smaller)
- Created modular architecture with clear separation of concerns
- Organized into 11 specialized modules

#### **New Modular Structure**
```
src/
├── config/       # Environment, database, logger configuration
├── middleware/   # Error handling, rate limiting, request logging
├── routes/       # API endpoints (agents, webhooks, health)
├── services/     # Business logic layer
└── validators/   # Input validation and sanitization
```

#### **API Versioning**
- All endpoints now have `/v1/` prefix
- Backwards compatible legacy routes (automatically redirects)
- Clear API evolution path

**New Endpoints:**
- `POST /v1/agents/register`
- `POST /v1/agents/verify`
- `GET /v1/agents`
- `PUT /v1/agents/:id/tier`
- `PUT /v1/agents/:id/status`
- `PUT /v1/agents/:id/permissions`
- `GET /v1/agents/:id/activity`
- `POST /v1/webhooks`
- `GET /v1/webhooks/events`
- `DELETE /v1/webhooks/:id`

#### **Centralized Error Handling**
- Custom `APIError` class with status codes and details
- `asyncHandler` wrapper eliminates repetitive try/catch
- Consistent error responses across all endpoints

#### **Structured Logging with Winston**
- Production-ready logging to files with rotation
- HTTP request/response logging
- Separate log levels (error, warn, info, http, debug)
- Automatic exception and rejection handlers

#### **Service Layer Pattern**
- **Agent Service**: 10 methods (registerAgent, verifyAgent, updateAgentTier, etc.)
- **Webhook Service**: 8 methods (createWebhook, regenerateSecret, etc.)
- Clean separation of business logic from HTTP layer

#### **Input Validation**
- Reusable validator functions
- Consistent error format
- Security-first validation (email, URLs, permissions)

#### **Testing**
- **56 passing tests** (up from 25)
- Integration tests for all endpoints
- Security tests (CORS, rate limiting)
- 100% API coverage

---

### ⚡ Frontend Performance Optimization (Phase 4)

#### **88% Bundle Size Reduction**
- Initial bundle: **~800 KB → 92 KB** (gzipped)
- Chart library (400 KB) lazy-loaded only on analytics page
- Target was <500 KB - achieved **82% under target**

#### **Code Splitting & Lazy Loading**
- All route components lazy-loaded with `React.lazy()`
- Suspense boundaries at route and page levels
- Custom `lazyWithPreload()` utility for route prefetching

**Bundle Breakdown (gzipped):**
- react-vendor: 52.76 KB
- query-vendor: 12.59 KB
- ui-vendor: 16.04 KB
- main app: 11.16 KB
- **Total: ~92 KB** ⚡

#### **React Query Optimization**
- 5-minute stale time (data stays fresh)
- 10-minute garbage collection
- No refetch on window focus/mount
- **60%+ reduction** in unnecessary API calls
- Structural sharing enabled for better re-render performance

#### **Performance Monitoring**
- Web Vitals tracking (INP, CLS, LCP, FCP, TTFB)
- Automatic performance metrics collection
- Sentry integration for production monitoring
- Custom performance hooks

#### **Loading States & UX**
- Comprehensive skeleton loader components
- Shimmer animations matching actual layouts
- Page-level and component-level loading states
- Reduces perceived load time

#### **Build Optimizations**
- Vendor chunking for better browser caching
- Terser minification (console.log removed in production)
- Bundle analyzer included (`dist/stats.html`)
- ES2015 target for smaller bundles

#### **Testing**
- **33 passing frontend tests**
- Component tests with React Testing Library
- Input sanitization tests (27 tests)
- ErrorBoundary tests

---

### 📊 Performance Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Backend server.js** | 1,590 lines | 208 lines | **87% reduction** |
| **Frontend bundle** | ~800 KB | 92 KB (gzipped) | **88% reduction** |
| **API calls** | High | Optimized | **60%+ fewer calls** |
| **Tests** | 25 backend | 56 backend + 33 frontend | **+256% coverage** |
| **Architecture** | Monolithic | Modular | Production-ready ✅ |

---

### 🛡️ Security Enhancements

- Environment-aware CORS configuration
- Centralized input validation
- XSS prevention with sanitization utilities
- Rate limiting per endpoint type
- Structured error responses (no stack traces in production)

---

### 📚 Documentation

**New Documentation Files:**
- `REFACTORING.md` - Complete backend refactoring guide
- `LOGGING.md` - Winston logging setup and usage
- `SENTRY.md` - Error tracking integration guide
- `PHASE4_RESULTS.md` - Frontend optimization results
- Migration guides for developers and API clients

---

### 🔧 Technical Improvements

#### Backend
- Modular routes with clear responsibilities
- Service layer for business logic
- Reusable validators
- Winston structured logging
- API versioning with `/v1/` prefix
- Graceful shutdown handling

#### Frontend
- Code splitting with React.lazy
- Optimized React Query caching
- Performance monitoring hooks
- Skeleton loader components
- Bundle visualization tools
- Sentry error tracking

---

### 📦 Dependencies

**Backend:**
- Added: winston ^3.19.0

**Frontend:**
- Added: web-vitals ^5.1.0
- Added: rollup-plugin-visualizer ^6.0.5
- Added: terser ^5.46.0
- Updated: @sentry/react ^10.38.0

---

### 🔄 Migration Guide

#### For Developers

**Updating Routes:**
```javascript
// Old pattern (monolithic)
app.post('/agents/register', async (req, res) => {
  // 100 lines of validation, logic, DB calls
});

// New pattern (modular)
router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  const validation = agentValidator.validateRegistration(req.body);
  if (!validation.valid) {
    throw new APIError('Validation failed', 400, validation.errors);
  }
  const agent = await agentService.registerAgent(req.body);
  res.status(201).json(agent);
}));
```

**Adding New Endpoints:**
1. Create validator in `src/validators/`
2. Add service method in `src/services/`
3. Add route in `src/routes/`
4. Write tests in `__tests__/integration/`

#### For API Clients

**URL Updates (Recommended):**
```bash
# Old
POST /agents/register

# New (preferred)
POST /v1/agents/register
```

Note: Old URLs still work (legacy compatibility) but emit warnings.

---

### ✅ Quality Assurance

- **Zero TypeScript errors**
- **All 89 tests passing** (56 backend + 33 frontend)
- **Production build successful** (4.25s build time)
- **Bundle size under target** (92 KB vs 500 KB target)
- **Full test coverage** for routes, services, validators

---

### 🎯 What's Next

**Phase 5: Documentation & Developer Experience (Optional)**
- API documentation with OpenAPI/Swagger
- Enhanced README files
- Development setup guide
- Deployment documentation
- Contribution guidelines

---

### 💡 Upgrade Instructions

1. **Pull latest code:**
   ```bash
   git pull origin main
   ```

2. **Install dependencies:**
   ```bash
   # Backend
   cd agentauth && npm install

   # Frontend
   cd agentauth-dashboard && npm install
   ```

3. **Run tests:**
   ```bash
   # Backend
   cd agentauth && npm test

   # Frontend
   cd agentauth-dashboard && npm test
   ```

4. **Build and deploy:**
   ```bash
   # Frontend
   cd agentauth-dashboard && npm run build

   # Backend
   cd agentauth && npm start
   ```

---

### 🙏 Credits

**Refactored and Optimized by:** Claude Sonnet 4.5
**Date:** January 31, 2026
**Phases Completed:** 1-4 (Security, Testing, Backend, Frontend)

---

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

All 56 tests should pass, covering:

- Health checks
- Permission listing
- Agent registration (valid & invalid)
- Agent verification (valid & invalid)
- Refresh token flow
- Webhook management
- Permission enforcement
- Admin vs regular user access
- CORS protection
- Security features
