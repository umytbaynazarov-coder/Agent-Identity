# Zero to Authenticated Agent in 5 Minutes (TypeScript)

> Get your first AI agent authenticated with AgentAuth using TypeScript/Node.js

## Prerequisites

- **Node.js 16+** (check with `node --version`)
- **npm**, **yarn**, or **pnpm**
- A code editor (VS Code recommended)
- 5 minutes of your time ⏱️

## Step 1: Install the SDK (30 seconds)

Choose your preferred package manager:

```bash
# npm
npm install @umytbaynazarow/agentauth-sdk

# or yarn
yarn add @umytbaynazarow/agentauth-sdk

# or pnpm
pnpm add @umytbaynazarow/agentauth-sdk
```

## Step 2: Create Your First Agent (2 minutes)

Create a file called `agent.ts`:

```typescript
import { AgentAuthClient, Permissions } from '@umytbaynazarow/agentauth-sdk';

async function main() {
  // 1. Initialize the client
  const client = new AgentAuthClient({
    baseURL: 'https://agentauth.dev', // Use your own API URL in production
  });

  // 2. Register an agent with scoped permissions
  console.log('🤖 Registering agent...');

  const { agent, credentials } = await client.registerAgent({
    name: 'My First Agent',
    owner_email: 'you@example.com',
    permissions: [
      Permissions.Zendesk.Tickets.Read,   // ✨ Auto-complete works here!
      Permissions.Slack.Messages.Write,
    ],
  });

  console.log('✅ Agent registered!');
  console.log('Agent ID:', agent.agent_id);
  console.log('API Key:', credentials.api_key);
  console.log('⚠️  Save this API key - it won\'t be shown again!');

  // 3. Verify credentials and get JWT token
  console.log('\n🔐 Verifying credentials...');

  const { token } = await client.verifyAgent({
    agent_id: agent.agent_id,
    api_key: credentials.api_key,
  });

  console.log('✅ Agent verified!');
  console.log('Access token:', token.access_token.substring(0, 20) + '...');
  console.log('Token expires in:', token.expires_in, 'seconds');

  // 4. The access token is automatically set!
  // client.setAccessToken(token.access_token) was called internally

  // 5. Make an authenticated request
  console.log('\n📊 Fetching activity logs...');

  const activity = await client.getActivity(agent.agent_id);
  console.log('Activity logs:', activity.logs.length, 'entries');

  console.log('\n🎉 Success! Your agent is now authenticated.');
}

main().catch(console.error);
```

## Step 3: Run Your Agent (1 minute)

### Option A: TypeScript Directly (recommended for learning)

Install `tsx` for easy TypeScript execution:

```bash
npm install -D tsx
npx tsx agent.ts
```

### Option B: Compile to JavaScript (recommended for production)

```bash
# Install TypeScript compiler
npm install -D typescript

# Compile
npx tsc agent.ts

# Run
node agent.js
```

You should see output like this:

```
🤖 Registering agent...
✅ Agent registered!
Agent ID: agent_abc123def456...
API Key: ak_xyz789uvw012...
⚠️  Save this API key - it won't be shown again!

🔐 Verifying credentials...
✅ Agent verified!
Access token: eyJhbGciOiJIUzI1NiI...
Token expires in: 3600 seconds

📊 Fetching activity logs...
Activity logs: 1 entries

🎉 Success! Your agent is now authenticated.
```

---

## Step 4: Save Your Credentials (1 minute)

Create a `.env` file in your project root:

```bash
# .env
AGENTAUTH_BASE_URL=https://agentauth.dev
AGENTAUTH_AGENT_ID=agent_abc123def456...
AGENTAUTH_API_KEY=ak_xyz789uvw012...
```

⚠️ **Important:** Add `.env` to your `.gitignore` to avoid committing secrets!

```bash
echo ".env" >> .gitignore
```

Now update your code to use environment variables:

```typescript
import { AgentAuthClient, Permissions } from '@umytbaynazarow/agentauth-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new AgentAuthClient({
  baseURL: process.env.AGENTAUTH_BASE_URL!,
  apiKey: process.env.AGENTAUTH_API_KEY!,
});

// Now you can skip registration and go straight to verification
const { token } = await client.verifyAgent({
  agent_id: process.env.AGENTAUTH_AGENT_ID!,
  api_key: process.env.AGENTAUTH_API_KEY!,
});

console.log('✅ Authenticated!');
```

---

## 🎯 What's Next?

### Integrate with Express.js

```typescript
import express from 'express';
import { AgentAuthClient } from '@umytbaynazarow/agentauth-sdk';

const app = express();
const authClient = new AgentAuthClient({
  baseURL: process.env.AGENTAUTH_BASE_URL!,
});

// Middleware to verify JWT
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  authClient.setAccessToken(token);
  next();
}

app.get('/protected', authenticate, (req, res) => {
  res.json({ message: 'This route is protected!' });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### Use Type-Safe Permissions

TypeScript gives you auto-completion for all 50+ permissions:

```typescript
import { Permissions, type Permission } from '@umytbaynazarow/agentauth-sdk';

// ✅ Auto-complete works!
const perms: Permission[] = [
  Permissions.Zendesk.Tickets.Read,
  Permissions.Zendesk.Tickets.Write,
  Permissions.Zendesk.Users.Read,
  Permissions.Slack.Messages.Write,
  Permissions.Slack.Channels.Read,
  Permissions.HubSpot.Contacts.Read,
  Permissions.GitHub.Repos.All,      // Wildcard: "github:repos:*"
  Permissions.Admin,                 // Super admin: "*:*:*"
];

// ✅ Or use string literals (still type-checked)
const manualPerms: Permission[] = [
  'salesforce:accounts:read',
  'stripe:payments:read',
];

// ❌ TypeScript error - invalid format
const invalid: Permission[] = [
  'invalid-permission',  // Type error!
];
```

### Handle Errors Gracefully

```typescript
import { AgentAuthClient, type AgentAuthError } from '@umytbaynazarow/agentauth-sdk';

try {
  const { agent } = await client.registerAgent({
    name: 'Test',
    owner_email: 'test@example.com',
    permissions: ['invalid:permission'], // ❌ Invalid
  });
} catch (error) {
  if (error instanceof FetchError) {
    const body = error.body as AgentAuthError;
    console.error('Error:', body.error);
    console.error('Details:', body.details);

    if (body.error === 'INVALID_PERMISSIONS') {
      console.error('Fix: Use valid permission format service:resource:action');
    }
  }
}
```

### Configure Retry Logic

```typescript
const client = new AgentAuthClient({
  baseURL: 'https://auth.yourcompany.com',
  maxRetries: 5,      // Retry up to 5 times (default: 3)
  timeout: 15000,     // 15-second timeout (default: 10000)
});

// Network failures and 429/5xx errors are automatically retried with exponential backoff
```

---

## 📚 Common Use Cases

### 1. Zendesk Support Bot

```typescript
const { agent, credentials } = await client.registerAgent({
  name: 'Zendesk Support Bot',
  owner_email: 'support@yourcompany.com',
  permissions: [
    Permissions.Zendesk.Tickets.Read,
    Permissions.Zendesk.Tickets.Write,
    Permissions.Zendesk.Users.Read,
  ],
});

// Use credentials to authenticate with Zendesk API
```

### 2. Slack Bot

```typescript
const { agent, credentials } = await client.registerAgent({
  name: 'Slack Notification Bot',
  owner_email: 'devops@yourcompany.com',
  permissions: [
    Permissions.Slack.Messages.Write,
    Permissions.Slack.Channels.Read,
  ],
});
```

### 3. GitHub CI/CD Agent

```typescript
const { agent, credentials } = await client.registerAgent({
  name: 'GitHub Actions Bot',
  owner_email: 'ci@yourcompany.com',
  permissions: [
    Permissions.GitHub.Repos.Read,
    Permissions.GitHub.Issues.Write,
    Permissions.GitHub.PullRequests.Write,
  ],
});
```

---

## 🔒 Production Best Practices

### 1. Environment Variables

```typescript
// ✅ Use dotenv for local development
import * as dotenv from 'dotenv';
dotenv.config();

const client = new AgentAuthClient({
  baseURL: process.env.AGENTAUTH_BASE_URL!,
  apiKey: process.env.AGENTAUTH_API_KEY!,
  timeout: parseInt(process.env.AGENTAUTH_TIMEOUT || '10000'),
});
```

### 2. Error Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

try {
  await client.registerAgent({ ... });
} catch (error) {
  logger.error('Agent registration failed', { error });
}
```

### 3. Health Checks

```typescript
async function checkAgentAuthHealth(): Promise<boolean> {
  try {
    await client.healthCheck();
    return true;
  } catch (error) {
    console.error('AgentAuth health check failed:', error);
    return false;
  }
}

// Run health check on startup
if (await checkAgentAuthHealth()) {
  console.log('✅ AgentAuth is healthy');
} else {
  console.error('❌ AgentAuth is unavailable');
  process.exit(1);
}
```

---

## 🐛 Troubleshooting

### "Cannot find module '@umytbaynazarow/agentauth-sdk'"

**Solution:** Make sure you installed the package:

```bash
npm install @umytbaynazarow/agentauth-sdk
```

### "Invalid credentials" error

**Solution:** Double-check your API key and agent ID:

```typescript
console.log('Agent ID:', process.env.AGENTAUTH_AGENT_ID);
console.log('API Key:', process.env.AGENTAUTH_API_KEY);
```

Make sure they match what was returned during registration.

### "Network timeout" error

**Solution:** Increase the timeout or check your network:

```typescript
const client = new AgentAuthClient({
  baseURL: process.env.AGENTAUTH_BASE_URL!,
  timeout: 30000,  // 30 seconds
});
```

### TypeScript errors with Permissions

**Solution:** Make sure you're importing the type:

```typescript
import { Permissions, type Permission } from '@umytbaynazarow/agentauth-sdk';
//                    ^^^^^ Don't forget this!

const perms: Permission[] = [Permissions.Zendesk.Tickets.Read];
```

---

## 📖 API Reference

For complete API documentation, see:

- [TypeScript SDK Reference](../../agentauth-sdk/README.md)
- [Permission Reference](../../agentauth/SCOPED_PERMISSIONS.md)
- [REST API Documentation](../../agentauth/README.md)

---

## 🎉 You're Ready!

You've successfully:
- ✅ Installed the AgentAuth TypeScript SDK
- ✅ Registered your first agent
- ✅ Verified credentials and got a JWT token
- ✅ Made authenticated API requests
- ✅ Learned production best practices

### What's Next?

- [Python Quick Start](python.md) - If you need a Python version
- [CLI Quick Start](cli.md) - For faster setup with the CLI tool
- [Express.js Integration Example](../examples/express-middleware.ts)
- [Join our Discord](https://discord.gg/agentauth) to get help

---

**Built with ❤️ for the AI agent revolution**

[← Back to Documentation](../index.md) | [Python Guide →](python.md)
