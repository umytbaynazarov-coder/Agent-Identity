# @umytbaynazarow/agentauth-sdk

> Lightweight, type-safe TypeScript SDK for AgentAuth - Authentication for AI Agents

[![Bundle Size](https://img.shields.io/badge/bundle%20size-<10KB-brightgreen)](https://bundlephobia.com/package/@umytbaynazarow/agentauth-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Why AgentAuth SDK?

- ✅ **Type-Safe**: Full TypeScript support with auto-completion for all 50+ permissions
- ✅ **Tiny Bundle**: < 10KB (vs Auth0's 100KB+)
- ✅ **Auto-Retry**: Built-in exponential backoff for network resilience
- ✅ **Zero Dependencies**: No bloat, just pure TypeScript
- ✅ **Tree-Shakeable**: Import only what you need

## Installation

```bash
npm install @umytbaynazarow/agentauth-sdk
# or
yarn add @umytbaynazarow/agentauth-sdk
# or
pnpm add @umytbaynazarow/agentauth-sdk
```

## Quick Start (< 5 minutes)

```typescript
import { AgentAuthClient, Permissions } from '@umytbaynazarow/agentauth-sdk';

// 1. Initialize the client
const client = new AgentAuthClient({
  baseURL: 'https://auth.yourcompany.com',
});

// 2. Register an agent with type-safe permissions
const { agent, credentials } = await client.registerAgent({
  name: 'Customer Support Agent',
  owner_email: 'you@company.com',
  permissions: [
    Permissions.Zendesk.Tickets.Read,  // ✨ Auto-complete!
    Permissions.Zendesk.Tickets.Write,
    Permissions.Slack.Messages.Write,
    Permissions.HubSpot.Contacts.Read,
  ],
});

// 3. Save the API key (shown only once!)
console.log('API Key:', credentials.api_key);

// 4. Verify agent and get JWT token
const { token } = await client.verifyAgent({
  agent_id: agent.agent_id,
  api_key: credentials.api_key,
});

// 5. Use the access token for authenticated requests
client.setAccessToken(token.access_token);

// 6. Make authenticated requests
const activity = await client.getActivity(agent.agent_id);
console.log('Recent activity:', activity);
```

## Core Features

### 1. Type-Safe Permissions

Get **auto-completion** for all permissions:

```typescript
import { Permissions, type Permission } from '@umytbaynazarow/agentauth-sdk';

// ✅ Type-safe permission builder
const permissions: Permission[] = [
  Permissions.Zendesk.Tickets.Read,      // "zendesk:tickets:read"
  Permissions.Slack.Messages.Write,      // "slack:messages:write"
  Permissions.GitHub.Repos.All,          // "github:repos:*"
  Permissions.Admin,                     // "*:*:*"
];

// ✅ Or use string literals (still type-checked!)
const manualPermissions: Permission[] = [
  'hubspot:contacts:read',
  'salesforce:leads:write',
];

// ❌ TypeScript error - invalid permission
const invalid: Permission[] = [
  'invalid:permission:format', // Type error!
];
```

### 2. Automatic Token Management

```typescript
// Token is automatically set after verify/refresh
const { token } = await client.verifyAgent({ agent_id, api_key });
// client.setAccessToken(token.access_token) is called automatically!

// Refresh token when expired
const refreshed = await client.refreshToken({
  refresh_token: token.refresh_token,
});
// New access token is auto-set again!
```

### 3. Built-in Retry Logic

Network failures and rate limits are handled automatically with exponential backoff:

```typescript
const client = new AgentAuthClient({
  baseURL: 'https://auth.yourcompany.com',
  maxRetries: 3,    // Retry up to 3 times (default: 3)
  timeout: 10000,   // 10-second timeout (default: 10000)
});

// If request fails with 5xx or 429, it will automatically:
// - Wait 1s, retry
// - Wait 2s, retry
// - Wait 4s, retry
// - If still failing, throw error
```

### 4. Complete Agent Management

```typescript
// Register agent
const { agent, credentials } = await client.registerAgent({
  name: 'Sales Agent',
  owner_email: 'sales@company.com',
  permissions: [Permissions.HubSpot.All],
});

// Get agent details
const agentDetails = await client.getAgent(agent.agent_id);

// List all agents (admin only)
const { agents, total } = await client.listAgents();

// Get activity logs
const activity = await client.getActivity(agent.agent_id, {
  limit: 50,
  offset: 0,
});

// Revoke agent
await client.revokeAgent(agent.agent_id);
```

### 5. Webhook Management

```typescript
// Register webhook
const webhook = await client.registerWebhook({
  url: 'https://yourapp.com/webhooks/agentauth',
  events: ['agent.verified', 'agent.revoked'],
});

// List webhooks
const { webhooks } = await client.listWebhooks();

// Regenerate secret
const updated = await client.regenerateWebhookSecret(webhook.webhook.id);

// Delete webhook
await client.deleteWebhook(webhook.webhook.id);
```

## API Reference

### Client Initialization

```typescript
interface AgentAuthConfig {
  baseURL: string;           // Required: Your AgentAuth API URL
  apiKey?: string;           // Optional: API key for authenticated requests
  accessToken?: string;      // Optional: JWT access token
  maxRetries?: number;       // Optional: Max retry attempts (default: 3)
  timeout?: number;          // Optional: Request timeout in ms (default: 10000)
}
```

### Available Methods

#### Agent Management
- `registerAgent(request)` - Register a new agent
- `verifyAgent(request)` - Verify credentials and get JWT
- `refreshToken(request)` - Refresh access token
- `revokeTokens()` - Revoke all refresh tokens
- `listAgents()` - List all agents (admin)
- `getAgent(agentId)` - Get agent details
- `revokeAgent(agentId)` - Revoke/deactivate agent
- `getActivity(agentId, params?)` - Get activity logs
- `updateAgentTier(agentId, tier)` - Update agent tier (admin)

#### Webhooks
- `registerWebhook(request)` - Register webhook
- `listWebhooks()` - List webhooks
- `deleteWebhook(webhookId)` - Delete webhook
- `regenerateWebhookSecret(webhookId)` - Regenerate secret
- `getWebhookEvents()` - List valid events

#### Utilities
- `listPermissions()` - List all available permissions
- `healthCheck()` - Check API health

## Advanced Examples

### Express.js Integration

```typescript
import express from 'express';
import { AgentAuthClient, Permissions } from '@umytbaynazarow/agentauth-sdk';

const app = express();
const authClient = new AgentAuthClient({
  baseURL: process.env.AGENTAUTH_URL!,
});

// Middleware to verify JWT
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  authClient.setAccessToken(token);
  next();
}

app.post('/api/agent/register', async (req, res) => {
  const { name, email } = req.body;

  const { agent, credentials } = await authClient.registerAgent({
    name,
    owner_email: email,
    permissions: [Permissions.Zendesk.Tickets.Read],
  });

  res.json({ agent, credentials });
});

app.listen(3000);
```

### FastAPI Integration (Python coming soon!)

The Python SDK will have a similar API:

```python
from agentauth import AgentAuthClient, Permissions

client = AgentAuthClient(base_url="https://auth.yourcompany.com")

agent = await client.register_agent(
    name="Support Agent",
    owner_email="you@company.com",
    permissions=[
        Permissions.Zendesk.Tickets.Read,
        Permissions.Slack.Messages.Write,
    ]
)
```

### Handling Errors

```typescript
import { AgentAuthClient, type AgentAuthError } from '@umytbaynazarow/agentauth-sdk';

try {
  await client.registerAgent({
    name: 'Test Agent',
    owner_email: 'test@example.com',
    permissions: ['invalid:permission'], // ❌ Invalid
  });
} catch (error) {
  if (error instanceof FetchError) {
    const body = error.body as AgentAuthError;
    console.error('Error:', body.error);
    console.error('Details:', body.details);
  }
}
```

## Permission Reference

### All Available Services

- **Zendesk**: `tickets`, `users`
- **Slack**: `messages`, `channels`
- **HubSpot**: `contacts`, `deals`, `companies`
- **GitHub**: `repos`, `issues`, `pull_requests`
- **Salesforce**: `accounts`, `leads`
- **Stripe**: `payments`, `customers`, `invoices` (read-only)

### Wildcard Permissions

```typescript
Permissions.Admin                    // "*:*:*" - Full access
Permissions.Zendesk.All              // "zendesk:*:*" - All Zendesk
Permissions.Zendesk.Tickets.All      // "zendesk:tickets:*" - All ticket actions
```

## Bundle Size Comparison

| Package | Bundle Size | Tree-Shakeable |
|---------|-------------|----------------|
| **@umytbaynazarow/agentauth-sdk** | **< 10 KB** | ✅ Yes |
| auth0-js | ~100 KB | ❌ No |
| @auth0/auth0-spa-js | ~35 KB | ⚠️ Partial |
| aws-sdk (Cognito) | ~250 KB | ⚠️ Partial |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Check bundle size
npm run size
```

## TypeScript Support

This package is written in TypeScript and includes type definitions out of the box. No need for `@types/*` packages!

```typescript
import type { Permission, Agent, AgentAuthConfig } from '@umytbaynazarow/agentauth-sdk';
```

## Contributing

Contributions are welcome! Please check out our [Contributing Guide](CONTRIBUTING.md).

## License

MIT © AgentAuth

## Support

- 📖 [Documentation](https://docs.agentauth.dev)
- 💬 [Discord Community](https://discord.gg/agentauth)
- 🐛 [Report Issues](https://github.com/yourusername/agentauth/issues)
- ✉️ Email: support@agentauth.dev

---

**Built with ❤️ for the AI agent revolution**
