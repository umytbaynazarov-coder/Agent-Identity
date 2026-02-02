# Agent-Identity

**Auth0 for AI Agents** - Issue cryptographically signed identities for autonomous AI agents

[![Version](https://img.shields.io/badge/version-0.7.0-blue.svg)](https://github.com/umytbaynazarov-coder/Agent-Identity/releases/tag/v0.7.0)
[![Tests](https://img.shields.io/badge/tests-89%20passing-brightgreen.svg)](https://github.com/umytbaynazarov-coder/Agent-Identity)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Uptime](https://img.shields.io/badge/uptime-99.9%25%20target-success.svg)](https://agentauths.betteruptime.com/)
[![Status](https://img.shields.io/badge/status-operational-success.svg)](https://agentauths.betteruptime.com/)

**Live API:** https://agentauth-production-b6b2.up.railway.app
**API Docs:** https://agentauth-production-b6b2.up.railway.app/api-docs
**Status Page:** https://agentauths.betteruptime.com/
**Documentation:** [SLA](docs/sla.md) | [Incident Log](docs/incidents.md) | [Setup Guide](docs/status-page-setup.md)

## ✨ What's New in v0.7.0

### 🧬 "Soul Layer" — Agent Identity, Integrity & Behavioral Trust
- **🧬 Persona System** - Define your agent's "digital soul" with HMAC-SHA256 signed behavioral profiles, guardrails, and constraints
- **🔐 ZKP Anonymous Verification** - Prove agent identity without revealing credentials (SHA-256 hash mode + Groth16 ZKP mode)
- **🛡️ Anti-Drift Vault** - Real-time behavioral monitoring with weighted drift scoring, spike detection, and auto-revoke
- **🧪 219 Passing Tests** - Comprehensive integration, unit, performance, and snapshot tests
- **📚 Full API Documentation** - OpenAPI 3.1 spec with 35 endpoints, versioned docs hosting
- **🖥️ Dashboard Updates** - Persona Manager and Anti-Drift pages with live gauges

[See full changelog →](agentauth/CHANGELOG.md#070---2026-02-01)

---

## 📚 API Documentation

Comprehensive API documentation is available:

- **[Interactive API Docs (Swagger UI)](http://localhost:3000/api-docs)** - Try out endpoints directly
- **[API Reference](docs/api-reference.md)** - Complete endpoint reference with code examples
- **[OpenAPI Specification](docs/openapi.yaml)** - Machine-readable API spec (OpenAPI 3.1)
- **[Persona Schema Reference](docs/persona-schema.md)** - JSON schema for agent behavioral profiles
- **[ZKP Proof Guide](docs/zkp-proof-guide.md)** - Client-side anonymous verification guide
- **[Drift-Proof Quickstart](docs/drift-proof-quickstart.md)** - Build a drift-proof agent in 5 steps

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
