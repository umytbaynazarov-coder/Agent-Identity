# Agent-Identity

Auth0 for AI Agents

Issue cryptographically signed identities for autonomous AI agents. Verify agent authenticity, enforce permissions, and track activity - all in 3 lines of code.

**Live API:** https://agentauth-production-b6b2.up.railway.app

## The Problem
AI agents need to interact with each other and external services, but there's no standard way to:

- Prove an agent belongs to a legitimate owner (not a rogue bot)
- Enforce what an agent can and cannot do (permissions)
- Track agent activity and revoke access when needed

## The Solution
Agent Identity provides a lightweight identity layer for AI agents:

```javascript
// Register an agent
const agent = await agentAuth.register({
  name: "my-research-bot",
  owner: "user@example.com",
  permissions: ["read_data", "call_apis"]
});

// Agent receives a signed token
console.log(agent.token); // eyJhbGc...

// Other services verify the agent
const verified = await agentAuth.verify(agent.token);
// { valid: true, agent_id: "agt_123", permissions: [...] }
```

## Features
- Cryptographic Identity - JWT-based agent tokens
- Fast Verification - Sub-10ms token validation
- Permission System - Define what each agent can do
- Activity Tracking - Audit log of all agent actions
- Instant Revocation - Deactivate compromised agents immediately

## Use Cases
- Agent-to-Agent Payments - Verify the agent requesting payment is authorized
- API Access Control - Gate your APIs to verified agents only
- Compliance - Track which agent performed which action
- Multi-Agent Systems - Agents verify each other before collaborating

## Quick Start

**1. Register an agent:**
```bash
curl -X POST https://agentauth-production-b6b2.up.railway.app/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-agent",
    "owner_email": "you@example.com",
    "permissions": ["read", "write"]
  }'
```

**2. Verify and get a JWT token:**
```bash
curl -X POST https://agentauth-production-b6b2.up.railway.app/agents/verify \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agt_xxx",
    "api_key": "ak_xxx"
  }'
```

**3. Access protected resources:**
```bash
curl https://agentauth-production-b6b2.up.railway.app/agents/agt_xxx \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## API Endpoints
- `GET /health` - Health check
- `POST /agents/register` - Register a new agent
- `POST /agents/verify` - Verify credentials and get JWT
- `GET /agents/:id` - Get agent details (requires auth)
