# Zero to Authenticated Agent in 5 Minutes (Python)

> Get your first AI agent authenticated with AgentAuth using Python

## Prerequisites

- **Python 3.8+** (check with `python --version`)
- **pip** package manager
- A code editor (VS Code or PyCharm recommended)
- 5 minutes of your time ⏱️

## Step 1: Install the SDK (30 seconds)

```bash
pip install umytbaynazarow-agentauth-sdk
```

Or with a virtual environment (recommended):

```bash
# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate  # On Windows

# Install SDK
pip install umytbaynazarow-agentauth-sdk
```

## Step 2: Create Your First Agent (2 minutes)

Create a file called `agent.py`:

```python
import asyncio
from agentauth_sdk import AgentAuthClient, Permissions

async def main():
    # 1. Initialize the client (context manager handles cleanup automatically)
    async with AgentAuthClient(
        base_url='https://agentauth.dev'  # Use your own API URL in production
    ) as client:

        # 2. Register an agent with scoped permissions
        print('🤖 Registering agent...')

        result = await client.register_agent(
            name='My First Agent',
            owner_email='you@example.com',
            permissions=[
                Permissions.Zendesk.Tickets.Read,   # ✨ IDE auto-complete works!
                Permissions.Slack.Messages.Write,
            ]
        )

        print('✅ Agent registered!')
        print(f'Agent ID: {result.agent.agent_id}')
        print(f'API Key: {result.credentials.api_key}')
        print('⚠️  Save this API key - it won\'t be shown again!')

        # 3. Verify credentials and get JWT token
        print('\n🔐 Verifying credentials...')

        verify_result = await client.verify_agent(
            agent_id=result.agent.agent_id,
            api_key=result.credentials.api_key
        )

        print('✅ Agent verified!')
        print(f'Access token: {verify_result.token.access_token[:20]}...')
        print(f'Token expires in: {verify_result.token.expires_in} seconds')

        # 4. The access token is automatically set!
        # client.set_access_token() was called internally

        # 5. Make an authenticated request
        print('\n📊 Fetching activity logs...')

        activity = await client.get_activity(result.agent.agent_id)
        print(f'Activity logs: {len(activity.logs)} entries')

        print('\n🎉 Success! Your agent is now authenticated.')

# Run the async function
if __name__ == '__main__':
    asyncio.run(main())
```

## Step 3: Run Your Agent (1 minute)

```bash
python agent.py
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

Install `python-dotenv` to load environment variables:

```bash
pip install python-dotenv
```

Now update your code to use environment variables:

```python
import asyncio
import os
from dotenv import load_dotenv
from agentauth_sdk import AgentAuthClient

load_dotenv()  # Load .env file

async def main():
    async with AgentAuthClient(
        base_url=os.getenv('AGENTAUTH_BASE_URL'),
        api_key=os.getenv('AGENTAUTH_API_KEY')
    ) as client:

        # Now you can skip registration and go straight to verification
        verify_result = await client.verify_agent(
            agent_id=os.getenv('AGENTAUTH_AGENT_ID'),
            api_key=os.getenv('AGENTAUTH_API_KEY')
        )

        print('✅ Authenticated!')
        print(f'Token: {verify_result.token.access_token[:20]}...')

if __name__ == '__main__':
    asyncio.run(main())
```

---

## 🎯 What's Next?

### Integrate with FastAPI

```python
from fastapi import FastAPI, Depends, HTTPException, Header
from agentauth_sdk import AgentAuthClient, Permissions
from typing import Optional

app = FastAPI()
auth_client = AgentAuthClient(base_url='https://agentauth.dev')

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
    """Protected route - requires JWT"""
    agent = await auth_client.get_agent(agent_id)
    return agent

@app.on_event("shutdown")
async def shutdown():
    await auth_client.close()

# Run with: uvicorn main:app --reload
```

### Use Type Hints

Python SDK includes full type hints for IDE auto-completion:

```python
from agentauth_sdk import (
    AgentAuthClient,
    Permissions,
    Permission,
    Agent,
    RegisterAgentRequest,
)

# Type hints work!
def create_support_agent() -> Agent:
    async with AgentAuthClient(base_url='https://auth.company.com') as client:
        result = await client.register_agent(
            name='Support Agent',
            owner_email='support@company.com',
            permissions=[Permissions.Zendesk.All]
        )
        return result.agent  # IDE knows this is an Agent object
```

### Handle Errors Gracefully

```python
import httpx
from agentauth_sdk import AgentAuthClient

async with AgentAuthClient(base_url='https://auth.company.com') as client:
    try:
        result = await client.register_agent(
            name='Test',
            owner_email='test@example.com',
            permissions=['invalid:permission']  # ❌ Invalid
        )
    except httpx.HTTPStatusError as error:
        # Handle HTTP errors (4xx, 5xx)
        response_data = error.response.json()
        print(f'Error: {response_data.get("error")}')
        print(f'Details: {response_data.get("details")}')

        if response_data.get('error') == 'INVALID_PERMISSIONS':
            print('Fix: Use valid permission format service:resource:action')

    except httpx.TimeoutException:
        print('Request timed out - check your network connection')

    except httpx.RequestError as error:
        print(f'Network error: {error}')
```

### Configure Retry Logic

```python
client = AgentAuthClient(
    base_url='https://auth.yourcompany.com',
    max_retries=5,      # Retry up to 5 times (default: 3)
    timeout=15.0,       # 15-second timeout (default: 10.0)
)

# Network failures and 429/5xx errors are automatically retried with exponential backoff
```

---

## 📚 Common Use Cases

### 1. Zendesk Support Bot

```python
result = await client.register_agent(
    name='Zendesk Support Bot',
    owner_email='support@yourcompany.com',
    permissions=[
        Permissions.Zendesk.Tickets.Read,
        Permissions.Zendesk.Tickets.Write,
        Permissions.Zendesk.Users.Read,
    ]
)

# Use credentials to authenticate with Zendesk API
print(f'Agent credentials: {result.credentials.api_key}')
```

### 2. Slack Bot

```python
result = await client.register_agent(
    name='Slack Notification Bot',
    owner_email='devops@yourcompany.com',
    permissions=[
        Permissions.Slack.Messages.Write,
        Permissions.Slack.Channels.Read,
    ]
)
```

### 3. Data Processing Agent (Django)

```python
# Django view
from django.http import JsonResponse
from agentauth_sdk import AgentAuthClient, Permissions
import asyncio

def register_data_agent(request):
    async def _register():
        async with AgentAuthClient(base_url='https://auth.company.com') as client:
            result = await client.register_agent(
                name='Data Processing Agent',
                owner_email='data@yourcompany.com',
                permissions=[
                    Permissions.HubSpot.Contacts.Read,
                    Permissions.Salesforce.Accounts.Read,
                ]
            )
            return result

    result = asyncio.run(_register())
    return JsonResponse({
        'agent_id': result.agent.agent_id,
        'api_key': result.credentials.api_key
    })
```

---

## 🔒 Production Best Practices

### 1. Environment Variables

```python
import os
from dotenv import load_dotenv

load_dotenv()  # Load .env file

# ✅ Use environment variables
client = AgentAuthClient(
    base_url=os.getenv('AGENTAUTH_BASE_URL'),
    api_key=os.getenv('AGENTAUTH_API_KEY'),
    timeout=float(os.getenv('AGENTAUTH_TIMEOUT', '10.0')),
    max_retries=int(os.getenv('AGENTAUTH_MAX_RETRIES', '3'))
)
```

### 2. Structured Logging

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('agentauth')

try:
    result = await client.register_agent(...)
    logger.info(f'Agent registered: {result.agent.agent_id}')
except Exception as error:
    logger.error(f'Agent registration failed: {error}', exc_info=True)
```

### 3. Health Checks

```python
async def check_agentauth_health() -> bool:
    """Check if AgentAuth API is healthy"""
    try:
        async with AgentAuthClient(base_url=os.getenv('AGENTAUTH_BASE_URL')) as client:
            await client.health_check()
            return True
    except Exception as error:
        logger.error(f'AgentAuth health check failed: {error}')
        return False

# Run health check on startup
if asyncio.run(check_agentauth_health()):
    print('✅ AgentAuth is healthy')
else:
    print('❌ AgentAuth is unavailable')
    sys.exit(1)
```

### 4. Connection Pooling

```python
# The SDK uses httpx which handles connection pooling automatically
# But you can configure it:

import httpx

async with AgentAuthClient(
    base_url='https://auth.company.com',
    timeout=10.0
) as client:
    # httpx client is reused for all requests
    # Connection pooling is automatic
    await client.register_agent(...)
```

---

## 🐛 Troubleshooting

### "ModuleNotFoundError: No module named 'agentauth_sdk'"

**Solution:** Make sure you installed the package:

```bash
pip install umytbaynazarow-agentauth-sdk
```

Check your Python path:
```bash
python -c "import sys; print(sys.path)"
```

### "RuntimeError: asyncio.run() cannot be called from a running event loop"

**Solution:** You're trying to run async code from inside an async context. Use `await` instead:

```python
# ❌ Wrong - inside async function
async def my_function():
    asyncio.run(main())  # Error!

# ✅ Correct - use await
async def my_function():
    await main()  # This works
```

### "Invalid credentials" error

**Solution:** Double-check your environment variables:

```python
import os
from dotenv import load_dotenv

load_dotenv()

print('Agent ID:', os.getenv('AGENTAUTH_AGENT_ID'))
print('API Key:', os.getenv('AGENTAUTH_API_KEY'))
```

Make sure they match what was returned during registration.

### Type checking errors with mypy

**Solution:** Install type stubs:

```bash
pip install mypy types-httpx

# Run type checking
mypy agent.py
```

---

## 📖 API Reference

For complete API documentation, see:

- [Python SDK Reference](../../agentauth-sdk-python/README.md)
- [FastAPI Example](../../agentauth-sdk-python/examples/fastapi_example.py)
- [Permission Reference](../../agentauth/SCOPED_PERMISSIONS.md)
- [REST API Documentation](../../agentauth/README.md)

---

## 🎉 You're Ready!

You've successfully:
- ✅ Installed the AgentAuth Python SDK
- ✅ Registered your first agent
- ✅ Verified credentials and got a JWT token
- ✅ Made authenticated API requests
- ✅ Learned production best practices

### What's Next?

- [TypeScript Quick Start](typescript.md) - If you need a TypeScript version
- [CLI Quick Start](cli.md) - For faster setup with the CLI tool
- [FastAPI Integration Example](../../agentauth-sdk-python/examples/fastapi_example.py)
- [Join our Discord](https://discord.gg/agentauth) to get help

---

**Built with ❤️ for the AI agent revolution**

[← Back to Documentation](../index.md) | [CLI Guide →](cli.md)
