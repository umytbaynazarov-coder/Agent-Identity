# umytbaynazarow-agentauth-sdk

> Lightweight, type-safe Python SDK for AgentAuth - Authentication for AI Agents

[![PyPI version](https://img.shields.io/pypi/v/umytbaynazarow-agentauth-sdk)](https://pypi.org/project/umytbaynazarow-agentauth-sdk/)
[![Python](https://img.shields.io/pypi/pyversions/umytbaynazarow-agentauth-sdk)](https://pypi.org/project/umytbaynazarow-agentauth-sdk/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Why AgentAuth SDK?

- ✅ **Type-Safe**: Full type hints with mypy support
- ✅ **Async-First**: Built on httpx with native async/await
- ✅ **Context Managers**: Automatic resource cleanup
- ✅ **Auto-Retry**: Built-in exponential backoff for network resilience
- ✅ **Zero Config**: Works out of the box with sensible defaults

## Installation

```bash
pip install umytbaynazarow-agentauth-sdk
```

## Quick Start (< 5 minutes)

```python
import asyncio
from agentauth_sdk import AgentAuthClient, Permissions

async def main():
    # 1. Initialize the client (context manager handles cleanup)
    async with AgentAuthClient(
        base_url='https://auth.yourcompany.com'
    ) as client:

        # 2. Register an agent with type-safe permissions
        result = await client.register_agent(
            name='Customer Support Agent',
            owner_email='you@company.com',
            permissions=[
                Permissions.Zendesk.Tickets.Read,   # Type-safe permissions!
                Permissions.Zendesk.Tickets.Write,
                Permissions.Slack.Messages.Write,
                Permissions.HubSpot.Contacts.Read,
            ]
        )

        # 3. Save the API key (shown only once!)
        print(f'API Key: {result.credentials.api_key}')

        # 4. Verify agent and get JWT token
        verify_result = await client.verify_agent(
            agent_id=result.agent.agent_id,
            api_key=result.credentials.api_key
        )

        # 5. Access token is automatically set!
        # client.set_access_token() is called internally

        # 6. Make authenticated requests
        activity = await client.get_activity(result.agent.agent_id)
        print(f'Recent activity: {activity}')

asyncio.run(main())
```

## Core Features

### 1. Type-Safe Permissions

Get **IDE auto-completion** for all permissions:

```python
from agentauth_sdk import Permissions, Permission

# ✅ Type-safe permission builder
permissions: list[Permission] = [
    Permissions.Zendesk.Tickets.Read,      # "zendesk:tickets:read"
    Permissions.Slack.Messages.Write,      # "slack:messages:write"
    Permissions.GitHub.Repos.All,          # "github:repos:*"
    Permissions.Admin,                     # "*:*:*"
]

# ✅ Or use string literals (still type-checked!)
manual_permissions: list[Permission] = [
    "hubspot:contacts:read",
    "salesforce:leads:write",
]
```

### 2. Automatic Token Management

```python
# Token is automatically set after verify/refresh
verify_result = await client.verify_agent(agent_id=agent_id, api_key=api_key)
# client.set_access_token(verify_result.token.access_token) is called automatically!

# Refresh token when expired
refreshed = await client.refresh_token(
    refresh_token=verify_result.token.refresh_token
)
# New access token is auto-set again!
```

### 3. Built-in Retry Logic

Network failures and rate limits are handled automatically with exponential backoff:

```python
client = AgentAuthClient(
    base_url='https://auth.yourcompany.com',
    max_retries=3,    # Retry up to 3 times (default: 3)
    timeout=10.0,     # 10-second timeout (default: 10.0)
)

# If request fails with 5xx or 429, it will automatically:
# - Wait 1s, retry
# - Wait 2s, retry
# - Wait 4s, retry
# - If still failing, raise exception
```

### 4. Context Manager Support

```python
# ✅ Recommended: Use context manager for automatic cleanup
async with AgentAuthClient(base_url='https://auth.company.com') as client:
    result = await client.register_agent(...)
    # Client is automatically closed when exiting the context

# ⚠️ Or manually manage lifecycle
client = AgentAuthClient(base_url='https://auth.company.com')
try:
    result = await client.register_agent(...)
finally:
    await client.close()  # Don't forget to close!
```

### 5. Complete Agent Management

```python
# Register agent
result = await client.register_agent(
    name='Sales Agent',
    owner_email='sales@company.com',
    permissions=[Permissions.HubSpot.All]
)

# Get agent details
agent_details = await client.get_agent(result.agent.agent_id)

# List all agents (admin only)
agents_result = await client.list_agents()
print(f'Total agents: {agents_result.total}')

# Get activity logs
activity = await client.get_activity(
    agent_id=result.agent.agent_id,
    limit=50,
    offset=0
)

# Revoke agent
await client.revoke_agent(result.agent.agent_id)
```

### 6. Webhook Management

```python
# Register webhook
webhook = await client.register_webhook(
    url='https://yourapp.com/webhooks/agentauth',
    events=['agent.verified', 'agent.revoked']
)

# List webhooks
webhooks_result = await client.list_webhooks()

# Regenerate secret
updated = await client.regenerate_webhook_secret(webhook.webhook.id)

# Delete webhook
await client.delete_webhook(webhook.webhook.id)
```

## API Reference

### Client Initialization

```python
from agentauth_sdk import AgentAuthClient

client = AgentAuthClient(
    base_url: str,              # Required: Your AgentAuth API URL
    api_key: str | None = None, # Optional: API key for authenticated requests
    access_token: str | None = None,  # Optional: JWT access token
    max_retries: int = 3,       # Optional: Max retry attempts
    timeout: float = 10.0,      # Optional: Request timeout in seconds
)
```

### Available Methods

#### Agent Management
- `register_agent(name, owner_email, permissions)` - Register a new agent
- `verify_agent(agent_id, api_key)` - Verify credentials and get JWT
- `refresh_token(refresh_token)` - Refresh access token
- `revoke_tokens()` - Revoke all refresh tokens
- `list_agents()` - List all agents (admin)
- `get_agent(agent_id)` - Get agent details
- `revoke_agent(agent_id)` - Revoke/deactivate agent
- `get_activity(agent_id, limit?, offset?)` - Get activity logs
- `update_agent_tier(agent_id, tier)` - Update agent tier (admin)

#### Webhooks
- `register_webhook(url, events)` - Register webhook
- `list_webhooks()` - List webhooks
- `delete_webhook(webhook_id)` - Delete webhook
- `regenerate_webhook_secret(webhook_id)` - Regenerate secret
- `get_webhook_events()` - List valid events

#### Utilities
- `list_permissions()` - List all available permissions
- `health_check()` - Check API health
- `close()` - Close HTTP client (called automatically with context manager)

## Advanced Examples

### FastAPI Integration

```python
from fastapi import FastAPI, Depends, HTTPException, Header
from agentauth_sdk import AgentAuthClient, Permissions
from typing import Optional

app = FastAPI()
auth_client = AgentAuthClient(base_url="https://auth.yourcompany.com")

# Dependency to verify JWT token
async def verify_token(authorization: Optional[str] = Header(None)):
    """Verify JWT token from Authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")

    token = authorization.split(" ")[1]
    auth_client.set_access_token(token)
    return token

@app.post("/agents/register")
async def register_agent(name: str, email: str):
    result = await auth_client.register_agent(
        name=name,
        owner_email=email,
        permissions=[Permissions.Zendesk.Tickets.Read]
    )
    return {
        "agent_id": result.agent.agent_id,
        "api_key": result.credentials.api_key
    }

@app.get("/agents/{agent_id}")
async def get_agent(agent_id: str, _token: str = Depends(verify_token)):
    """Get agent details (authenticated)"""
    agent = await auth_client.get_agent(agent_id)
    return agent

@app.on_event("shutdown")
async def shutdown():
    await auth_client.close()
```

### Django Integration

```python
# settings.py
AGENTAUTH_BASE_URL = "https://auth.yourcompany.com"

# middleware.py
from agentauth_sdk import AgentAuthClient
from django.conf import settings

class AgentAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.client = AgentAuthClient(base_url=settings.AGENTAUTH_BASE_URL)

    async def __call__(self, request):
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            self.client.set_access_token(token)
            request.agent_auth = self.client

        response = await self.get_response(request)
        return response

# views.py
from django.http import JsonResponse
from asgiref.sync import async_to_sync

async def register_agent(request):
    result = await request.agent_auth.register_agent(
        name=request.POST['name'],
        owner_email=request.POST['email'],
        permissions=['zendesk:tickets:read']
    )
    return JsonResponse({
        'agent_id': result.agent.agent_id,
        'api_key': result.credentials.api_key
    })
```

### Handling Errors

```python
from agentauth_sdk import AgentAuthClient
import httpx

async with AgentAuthClient(base_url='https://auth.company.com') as client:
    try:
        result = await client.register_agent(
            name='Test Agent',
            owner_email='test@example.com',
            permissions=['invalid:permission']  # ❌ Invalid
        )
    except httpx.HTTPStatusError as error:
        # Handle HTTP errors (4xx, 5xx)
        print(f'HTTP Error: {error.response.status_code}')
        print(f'Response: {error.response.json()}')
    except httpx.TimeoutException:
        # Handle timeout
        print('Request timed out')
    except httpx.RequestError as error:
        # Handle network errors
        print(f'Network error: {error}')
```

### Production Deployment Tips

```python
import os
from agentauth_sdk import AgentAuthClient

# ✅ Use environment variables
client = AgentAuthClient(
    base_url=os.getenv('AGENTAUTH_BASE_URL'),
    api_key=os.getenv('AGENTAUTH_API_KEY'),
    timeout=float(os.getenv('AGENTAUTH_TIMEOUT', '10.0')),
    max_retries=int(os.getenv('AGENTAUTH_MAX_RETRIES', '3'))
)

# ✅ Configure logging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('agentauth_sdk')

# ✅ Health checks
async def check_agentauth_health():
    async with AgentAuthClient(base_url=os.getenv('AGENTAUTH_BASE_URL')) as client:
        try:
            await client.health_check()
            return True
        except Exception as e:
            logger.error(f'AgentAuth health check failed: {e}')
            return False
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

```python
Permissions.Admin                    # "*:*:*" - Full access
Permissions.Zendesk.All              # "zendesk:*:*" - All Zendesk
Permissions.Zendesk.Tickets.All      # "zendesk:tickets:*" - All ticket actions
```

## Type Hints

This package includes full type hints for Python 3.8+:

```python
from agentauth_sdk import (
    AgentAuthClient,
    Permissions,
    Permission,
    Agent,
    RegisterAgentRequest,
    VerifyAgentRequest,
    ActivityLog,
    Webhook,
)

# Type checking with mypy
def create_support_agent() -> Agent:
    async with AgentAuthClient(base_url='https://auth.company.com') as client:
        result = await client.register_agent(
            name='Support Agent',
            owner_email='support@company.com',
            permissions=[Permissions.Zendesk.All]
        )
        return result.agent
```

## Development

```bash
# Install dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Type checking
mypy agentauth_sdk

# Lint
ruff check agentauth_sdk

# Format
black agentauth_sdk
```

## Requirements

- Python 3.8+
- httpx >= 0.24.0

## Async/Await

This SDK is fully async. All methods that make API requests are async and must be awaited:

```python
# ✅ Correct
async def main():
    async with AgentAuthClient(base_url='...') as client:
        result = await client.register_agent(...)  # await required

asyncio.run(main())

# ❌ Incorrect - will not work
def main():
    client = AgentAuthClient(base_url='...')
    result = client.register_agent(...)  # Missing await and async context
```

## Comparison with TypeScript SDK

| Feature | TypeScript SDK | Python SDK |
|---------|---------------|------------|
| **Installation** | `npm install @umytbaynazarow/agentauth-sdk` | `pip install umytbaynazarow-agentauth-sdk` |
| **Type Safety** | ✅ Full TypeScript | ✅ Full type hints |
| **Async Support** | ✅ Promises/async-await | ✅ asyncio/async-await |
| **Auto-Retry** | ✅ Exponential backoff | ✅ Exponential backoff |
| **Bundle Size** | < 10KB | N/A (Python) |
| **Context Managers** | N/A | ✅ `async with` |
| **Framework Integration** | Express, Next.js | FastAPI, Django |

## Contributing

Contributions are welcome! Please check out our [Contributing Guide](../../CONTRIBUTING.md).

## License

MIT © AgentAuth

## Support

- 📖 [Documentation](https://docs.agentauth.dev)
- 💬 [Discord Community](https://discord.gg/agentauth)
- 🐛 [Report Issues](https://github.com/umytbaynazarov-coder/Agent-Identity/issues)
- ✉️ Email: umytappleb7@icloud.com

---

**Built with ❤️ for the AI agent revolution**
