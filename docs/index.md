# AgentAuth Documentation

> Authentication for AI Agents - Simple, Secure, Self-Hosted

Welcome to the AgentAuth documentation! AgentAuth is an open-source authentication system built specifically for AI agents, offering a free, self-hosted alternative to Auth0 and WorkOS.

## 🚀 Quick Start

Get up and running in under 5 minutes with your preferred stack:

### Choose Your SDK

<div class="sdk-grid">

#### [TypeScript/Node.js →](getting-started/typescript.md)
```bash
npm install @umytbaynazarow/agentauth-sdk
```
Perfect for Node.js backends, Express apps, and Next.js

#### [Python →](getting-started/python.md)
```bash
pip install umytbaynazarow-agentauth-sdk
```
Ideal for FastAPI, Django, and Python-based agents

#### [CLI Tool →](getting-started/cli.md)
```bash
npm install -g @umytbaynazarow/agentauth-cli
```
For quick setup, testing, and deployment validation

</div>

---

## 📚 Getting Started Guides

### Beginner-Friendly Tutorials

- **[TypeScript Quick Start](getting-started/typescript.md)** - Zero to authenticated agent in 5 minutes
- **[Python Quick Start](getting-started/python.md)** - Async/await with FastAPI integration
- **[CLI Quick Start](getting-started/cli.md)** - Interactive setup wizard and local testing

---

## 💡 Core Concepts

### What is AgentAuth?

AgentAuth is an authentication system designed specifically for AI agents, not humans. Instead of managing user passwords and sessions, it handles:

- **Agent Credentials**: API keys and JWT tokens for programmatic access
- **Scoped Permissions**: Fine-grained access control (`zendesk:tickets:read`, not generic "admin")
- **Webhook Events**: Real-time notifications for agent lifecycle events
- **Rate Limiting**: Tier-based rate limits (free, pro, enterprise)

### Why AgentAuth vs Auth0/WorkOS?

| Feature | Auth0 | WorkOS | **AgentAuth** |
|---------|-------|--------|---------------|
| Pricing | $240/mo for 500 users | $25/mo base | **$0 (self-hosted)** |
| Built for AI Agents | ❌ No | ❌ No | **✅ Yes** |
| Self-Hosted | ❌ No | ❌ No | **✅ Yes** |
| Scoped Permissions | Basic RBAC | Limited | **✅ Full `service:resource:action`** |
| Setup Time | 30+ minutes | 15+ minutes | **< 3 minutes (CLI)** |
| Data Control | Auth0's servers | WorkOS's servers | **Your infrastructure** |
| Open Source | ❌ No | ❌ No | **✅ MIT License** |

---

## 🎯 Key Features

### 1. Type-Safe Permissions

```typescript
// TypeScript
Permissions.Zendesk.Tickets.Read  // Auto-complete!
Permissions.Slack.Messages.Write
Permissions.Admin  // "*:*:*"
```

```python
# Python
Permissions.Zendesk.Tickets.Read  # Type hints!
Permissions.Slack.Messages.Write
Permissions.Admin  # "*:*:*"
```

### 2. Built-in Retry Logic

Network failures and rate limits are handled automatically with exponential backoff.

### 3. Webhook Events

Subscribe to real-time events:
- `agent.registered`
- `agent.verified`
- `agent.revoked`
- `token.refreshed`

### 4. Activity Logs

Track every agent action with queryable activity logs and pagination support.

### 5. Soul Layer (v0.7.0)

Three pillars of agent identity and behavioral trust:

- **Persona System** - HMAC-SHA256 signed behavioral profiles with traits, guardrails, and constraints
- **ZKP Anonymous Verification** - Prove agent identity without revealing credentials
- **Anti-Drift Vault** - Weighted drift scoring, spike detection, and auto-revoke

### 6. CLI Tools

```bash
agentauth init          # Interactive setup
agentauth test          # Local testing with mock server
agentauth deploy --check  # Pre-deployment validation
```

---

## 🔄 Migration Guides

Already using another auth provider? Migrate your agents to AgentAuth:

- **[Auth0 Migration](migration/auth0.md)** - Import users, roles, and permissions from Auth0
- **[JWT / Custom Auth](migration/jwt.md)** - Import from any JWT-based system via JSON config
- **[Clerk Migration](migration/clerk.md)** - Import users and metadata from Clerk
- **[WorkOS Migration](migration/workos.md)** - Import users and org roles from WorkOS

```bash
# Example: Dry-run an Auth0 migration
agentauth migrate auth0 \
  --domain tenant.auth0.com \
  --client-id xxx --client-secret xxx \
  --dry-run
```

---

## 📖 API Reference

### SDKs

- **[TypeScript SDK Reference](../agentauth-sdk/README.md)** - Full TypeScript API documentation
- **[Python SDK Reference](../agentauth-sdk-python/README.md)** - Full Python API documentation
- **[CLI Reference](../agentauth-cli/README.md)** - CLI command reference

### REST API

- **[API Endpoints](../agentauth/README.md)** - Backend REST API documentation
- **[API Reference](api-reference.md)** - Complete v0.7.0 endpoint reference with code examples
- **[OpenAPI Specification](openapi.yaml)** - Machine-readable API spec (OpenAPI 3.1, 35 endpoints)
- **[Scoped Permissions](../agentauth/SCOPED_PERMISSIONS.md)** - Permission system guide

### Soul Layer (v0.7.0)

- **[Persona Schema Reference](persona-schema.md)** - JSON schema for agent behavioral profiles
- **[ZKP Proof Guide](zkp-proof-guide.md)** - Client-side anonymous verification (hash + Groth16)
- **[Drift-Proof Quickstart](drift-proof-quickstart.md)** - Build a drift-proof agent in 5 steps

---

## 🏗️ Architecture

### System Overview

```
┌─────────────┐
│  Your App   │
│  (Agent)    │
└──────┬──────┘
       │
       │ 1. Register agent
       ├────────────────────────┐
       │                        ▼
       │              ┌──────────────────┐
       │              │   AgentAuth API  │
       │              │   (Self-Hosted)  │
       │              └──────────────────┘
       │                        │
       │ 2. Get credentials     │
       │◄───────────────────────┘
       │
       │ 3. Verify & get JWT
       ├───────────────────────┐
       │                       ▼
       │              ┌──────────────────┐
       │              │   AgentAuth API  │
       │              └──────────────────┘
       │                       │
       │ 4. Access token       │
       │◄──────────────────────┘
       │
       │ 5. Make authenticated requests
       └───────────────────────►
```

### Components

1. **AgentAuth API** - Backend service (Node.js + PostgreSQL)
2. **TypeScript SDK** - npm package for Node.js apps
3. **Python SDK** - PyPI package for Python apps
4. **CLI Tool** - Command-line interface for setup and testing

---

## 🎨 Examples

### Real-World Integrations

- **[Express.js Middleware](examples/express-middleware.ts)** - Authentication middleware for Express apps
- **[FastAPI Dependency](../agentauth-sdk-python/examples/fastapi_example.py)** - FastAPI JWT verification
- **[Django Integration](examples/django-integration.md)** - Django middleware for agent auth

### Use Cases

- **Zendesk Support Bot** - Authenticate agents to access support tickets
- **Slack Bot** - Secure API access for workspace automation
- **GitHub Automation** - Agent authentication for CI/CD pipelines
- **HubSpot CRM Agent** - Scoped access to contacts and deals

---

## 🔒 Security Best Practices

### Production Checklist

- ✅ Use HTTPS for all API communication
- ✅ Store API keys in environment variables (never commit to git)
- ✅ Rotate API keys regularly
- ✅ Use scoped permissions (principle of least privilege)
- ✅ Enable rate limiting (tier-based)
- ✅ Monitor activity logs for suspicious patterns
- ✅ Set up webhooks for real-time alerts
- ✅ Use short-lived JWT tokens (< 1 hour)

### Environment Variables

```bash
# Required
AGENTAUTH_BASE_URL=https://auth.yourcompany.com
AGENTAUTH_AGENT_ID=agent_abc123...
AGENTAUTH_API_KEY=ak_secret123...

# Optional
AGENTAUTH_ENVIRONMENT=production
AGENTAUTH_TOKEN_LIFETIME=3600  # 1 hour
AGENTAUTH_DEBUG=false
```

---

## 🚢 Deployment

### Quick Deploy Options

- **[Railway](https://railway.app)** - One-click deploy (free tier)
- **[Render](https://render.com)** - Auto-deploy from GitHub
- **[Fly.io](https://fly.io)** - Edge deployment
- **[DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)** - Managed containers

### Self-Hosted

```bash
# Clone repository
git clone https://github.com/umytbaynazarov-coder/Agent-Identity.git

# Install dependencies
cd Agent-Identity/agentauth
npm install

# Set up database (PostgreSQL)
createdb agentauth
psql agentauth < schema.sql

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start server
npm start

# Production: Use PM2 or Docker
```

---

## 🤝 Community & Support

### Get Help

- 📖 **Documentation**: You're here!
- 💬 **Discord**: [Join our community](https://discord.gg/agentauth)
- 🐛 **Issues**: [GitHub Issues](https://github.com/umytbaynazarov-coder/Agent-Identity/issues)
- ✉️ **Email**: umytappleb7@icloud.com

### Contributing

We welcome contributions! See our [Contributing Guide](../CONTRIBUTING.md) for details.

### Roadmap

- ✅ TypeScript SDK (Days 1-2)
- ✅ Python SDK (Days 3-4)
- ✅ CLI Tool (Days 5-6)
- ✅ Documentation (Day 7)
- ✅ Migration Tools - Auth0, JWT, Clerk, WorkOS (Days 8-14)
- 🚧 Admin Dashboard (Days 15-21)
- 🚧 Load Testing Suite (Days 22-24)

---

## 📄 License

AgentAuth is open source software licensed under the [MIT License](../LICENSE).

---

**Built with ❤️ for the AI agent revolution**

[Get Started →](getting-started/typescript.md) | [View on GitHub](https://github.com/umytbaynazarov-coder/Agent-Identity)
