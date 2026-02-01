# Agent-Identity

**Auth0 for AI Agents** - Issue cryptographically signed identities for autonomous AI agents

[![Version](https://img.shields.io/badge/version-0.5.0-blue.svg)](https://github.com/umytbaynazarov-coder/Agent-Identity/releases/tag/v0.5.0)
[![Tests](https://img.shields.io/badge/tests-89%20passing-brightgreen.svg)](https://github.com/umytbaynazarov-coder/Agent-Identity)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Uptime](https://img.shields.io/badge/uptime-99.9%25%20target-success.svg)](docs/sla.md)
<!-- Replace with actual status badge after setting up monitoring service:
[![Status](https://betteruptime.com/status-badges/v1/monitor/xxxxx.svg)](https://status.agentauth.dev)
-->

**Live API:** https://agentauth-production-b6b2.up.railway.app
**API Docs:** https://agentauth-production-b6b2.up.railway.app/api-docs
**Status:** [Service Status](docs/status-page-setup.md) | [SLA](docs/sla.md) | [Incident Log](docs/incidents.md)

## ✨ What's New in v0.5.0

### 🚀 Production-Grade Architecture
- **87% backend code reduction** (1,590 → 208 lines)
- **88% frontend bundle reduction** (800 KB → 92 KB gzipped)
- Modular architecture with services, routes, validators
- API versioning (\`/v1/\` endpoints)
- Winston structured logging
- **89 tests passing** (56 backend + 33 frontend)

[See full changelog →](agentauth/CHANGELOG.md#050---2026-01-31)

---

## 📚 API Documentation

Comprehensive API documentation is available:

- **[Interactive API Docs (Swagger UI)](http://localhost:3000/api-docs)** - Try out endpoints directly
- **[API Reference](docs/api-reference.md)** - Complete endpoint reference with code examples
- **[OpenAPI Specification](docs/openapi.yaml)** - Machine-readable API spec (OpenAPI 3.1)

**Quick Start:**
```bash
# Register an agent
curl -X POST https://api.agentauth.dev/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name":"MyAgent","owner_email":"you@example.com"}'

# Verify credentials
curl -X POST https://api.agentauth.dev/v1/agents/verify \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"ag_xxx","api_key":"ag_sk_xxx"}'
```

---

## The Problem

AI agents need to interact with each other and external services, but there's no standard way to:

- Prove an agent belongs to a legitimate owner (not a rogue bot)
- Enforce what an agent can and cannot do (permissions)
- Track agent activity and revoke access when needed

## The Solution

Agent Identity provides a lightweight identity layer for AI agents.

See the original [README.md](https://github.com/umytbaynazarov-coder/Agent-Identity/blob/main/README.md) for full documentation.
