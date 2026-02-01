# AgentAuth API Reference

Complete API reference for AgentAuth v0.5.0. All endpoints, authentication, rate limits, error handling, and code examples.

## Table of Contents

1. [Base URL](#base-url)
2. [Authentication](#authentication)
3. [Rate Limits](#rate-limits)
4. [Endpoints](#endpoints)
5. [Error Handling](#error-handling)
6. [Webhooks](#webhooks)
7. [Code Examples](#code-examples)

---

## Base URL

| Environment | URL |
|-------------|-----|
| **Production** | `https://api.agentauth.dev` |
| **Staging** | `https://staging-api.agentauth.dev` |
| **Local** | `http://localhost:3000` |

---

## Authentication

### How to Get Your API Key

1. **Register an Agent**

   Make a POST request to `/v1/agents/register`:

   ```bash
   curl -X POST https://api.agentauth.dev/v1/agents/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "MyAgent",
       "owner_email": "you@example.com",
       "permissions": ["read:data", "write:data"]
     }'
   ```

   **Response:**
   ```json
   {
     "agent_id": "ag_1a2b3c4d5e6f",
     "name": "MyAgent",
     "owner_email": "you@example.com",
     "api_key": "ag_sk_1a2b3c4d5e6f7g8h9i0j",
     "tier": "free",
     "permissions": ["read:data", "write:data"],
     "created_at": "2026-01-31T12:00:00.000Z"
   }
   ```

   **⚠️ IMPORTANT:** Save the `api_key` - it's only shown once!

2. **Use the API Key in Requests**

   Include the API key in the `Authorization` header:

   ```
   Authorization: Bearer ag_sk_1a2b3c4d5e6f7g8h9i0j
   ```

### Verifying Credentials

To verify your agent credentials are valid:

```bash
curl -X POST https://api.agentauth.dev/v1/agents/verify \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "ag_1a2b3c4d5e6f",
    "api_key": "ag_sk_1a2b3c4d5e6f7g8h9i0j"
  }'
```

**Success Response:**
```json
{
  "valid": true,
  "agent_id": "ag_1a2b3c4d5e6f",
  "name": "MyAgent",
  "tier": "free",
  "permissions": ["read:data", "write:data"],
  "status": "active"
}
```

---

## Rate Limits

AgentAuth implements rate limiting to prevent abuse:

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| **Authentication** (`/v1/agents/register`, `/v1/agents/verify`) | 10 requests | 15 minutes |
| **General** (all other endpoints) | 100 requests | 15 minutes |

### Rate Limit Headers

Every response includes rate limit information:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1738329600
```

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |

### Rate Limit Exceeded Response

When you exceed the rate limit:

**Status Code:** `429 Too Many Requests`

**Response Body:**
```json
{
  "error": "Rate Limit Exceeded",
  "message": "Too many requests. Please try again later."
}
```

**Best Practices:**
- Check `X-RateLimit-Remaining` before making requests
- Implement exponential backoff when rate limited
- Cache responses when possible

---

## Endpoints

### Interactive API Docs

For interactive API documentation with "Try it out" functionality:

**Swagger UI:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

### Quick Reference

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/health` | Health check | ❌ No |
| `POST` | `/v1/agents/register` | Register new agent | ❌ No |
| `POST` | `/v1/agents/verify` | Verify agent credentials | ❌ No |
| `GET` | `/v1/agents` | List all agents | ⚠️ Future |
| `GET` | `/v1/agents/:agent_id` | Get agent details | ⚠️ Future |
| `PUT` | `/v1/agents/:agent_id/tier` | Update agent tier | ⚠️ Future |
| `PUT` | `/v1/agents/:agent_id/status` | Update agent status | ⚠️ Future |
| `PUT` | `/v1/agents/:agent_id/permissions` | Update permissions | ⚠️ Future |
| `DELETE` | `/v1/agents/:agent_id` | Delete agent | ⚠️ Future |
| `GET` | `/v1/agents/:agent_id/activity` | Get activity logs | ⚠️ Future |
| `POST` | `/v1/webhooks` | Create webhook | ⚠️ Future |
| `GET` | `/v1/webhooks` | List webhooks | ⚠️ Future |
| `GET` | `/v1/webhooks/events` | List available events | ❌ No |
| `GET` | `/v1/webhooks/:webhook_id` | Get webhook details | ⚠️ Future |
| `PUT` | `/v1/webhooks/:webhook_id` | Update webhook | ⚠️ Future |
| `DELETE` | `/v1/webhooks/:webhook_id` | Delete webhook | ⚠️ Future |
| `POST` | `/v1/webhooks/:webhook_id/regenerate-secret` | Regenerate webhook secret | ⚠️ Future |
| `POST` | `/v1/webhooks/:webhook_id/toggle` | Toggle webhook status | ⚠️ Future |
| `GET` | `/v1/webhooks/:webhook_id/deliveries` | Get delivery history | ⚠️ Future |

⚠️ *Authentication will be added in a future version*

For detailed endpoint documentation, see the [OpenAPI Specification](openapi.yaml) or [Swagger UI](http://localhost:3000/api-docs).

---

## Error Handling

AgentAuth uses standard HTTP status codes and returns consistent error responses.

### HTTP Status Codes

| Status Code | Meaning | Description |
|-------------|---------|-------------|
| `200 OK` | Success | Request succeeded |
| `201 Created` | Created | Resource created successfully |
| `400 Bad Request` | Client Error | Invalid request data (validation failed) |
| `401 Unauthorized` | Client Error | Invalid or missing credentials |
| `403 Forbidden` | Client Error | Insufficient permissions |
| `404 Not Found` | Client Error | Resource not found |
| `429 Too Many Requests` | Client Error | Rate limit exceeded |
| `500 Internal Server Error` | Server Error | Unexpected server error |
| `503 Service Unavailable` | Server Error | Service temporarily unavailable |

### Error Response Format

All errors follow this structure:

```json
{
  "error": "Error Type",
  "message": "Human-readable error description",
  "details": [
    {
      "field": "email",
      "message": "Must be a valid email address"
    }
  ]
}
```

### Common Errors

#### 400 Bad Request - Validation Failed

**Example:**
```json
{
  "error": "Validation failed",
  "message": "Invalid input data",
  "details": [
    {
      "field": "owner_email",
      "message": "Must be a valid email address"
    },
    {
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

**How to fix:** Check the `details` array and correct each validation error.

---

#### 401 Unauthorized - Invalid Credentials

**Example:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid agent credentials"
}
```

**How to fix:**
- Ensure `agent_id` and `api_key` are correct
- Check for typos in the API key
- Verify the agent hasn't been deleted

---

#### 404 Not Found - Resource Not Found

**Example:**
```json
{
  "error": "Not Found",
  "message": "Agent not found"
}
```

**How to fix:**
- Verify the `agent_id` or `webhook_id` is correct
- Check if the resource was deleted

---

#### 429 Rate Limit Exceeded

**Example:**
```json
{
  "error": "Rate Limit Exceeded",
  "message": "Too many requests. Please try again later."
}
```

**How to fix:**
- Wait until `X-RateLimit-Reset` timestamp
- Implement exponential backoff
- Reduce request frequency

---

#### 500 Internal Server Error

**Example:**
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

**How to fix:**
- This is a server-side error - not your fault
- Retry the request with exponential backoff
- If persistent, contact support: umytbaynazarow754@gmail.com

---

## Webhooks

Webhooks allow you to receive real-time notifications when events occur in AgentAuth.

### Available Events

| Event | Description | Triggered When |
|-------|-------------|----------------|
| `agent.registered` | New agent created | Agent successfully registers |
| `agent.verified` | Agent verified | Agent credentials verified successfully |
| `agent.verification_failed` | Verification failed | Agent verification attempt failed |
| `agent.tier_updated` | Tier changed | Agent's pricing tier is updated |
| `agent.status_updated` | Status changed | Agent's status is updated (active/inactive/suspended) |
| `agent.permissions_updated` | Permissions changed | Agent's permissions are modified |
| `agent.deleted` | Agent removed | Agent is permanently deleted |

### Webhook Payload Structure

All webhook payloads follow this structure:

```json
{
  "event": "agent.verified",
  "timestamp": "2026-01-31T12:00:00.000Z",
  "data": {
    "agent_id": "ag_1a2b3c4d5e6f",
    "name": "CustomerSupportAgent",
    "tier": "free",
    "status": "active"
  }
}
```

### Webhook Signatures

Every webhook request includes a signature for verification:

**Header:**
```http
X-Webhook-Signature: sha256=a1b2c3d4e5f6...
```

**Verify the signature:**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return `sha256=${expectedSignature}` === signature;
}

// Usage
const isValid = verifyWebhookSignature(
  req.body,
  req.headers['x-webhook-signature'],
  'whsec_your_webhook_secret'
);
```

### Creating a Webhook

**Request:**
```bash
curl -X POST https://api.agentauth.dev/v1/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "ag_1a2b3c4d5e6f",
    "url": "https://api.yourapp.com/webhooks/agentauth",
    "events": [
      "agent.verified",
      "agent.verification_failed",
      "agent.tier_updated"
    ]
  }'
```

**Response:**
```json
{
  "id": "wh_1a2b3c4d5e6f",
  "agent_id": "ag_1a2b3c4d5e6f",
  "url": "https://api.yourapp.com/webhooks/agentauth",
  "events": [
    "agent.verified",
    "agent.verification_failed",
    "agent.tier_updated"
  ],
  "secret": "whsec_1a2b3c4d5e6f7g8h",
  "is_active": true,
  "created_at": "2026-01-31T12:00:00.000Z"
}
```

**⚠️ Save the `secret`** - it's only shown once!

---

## Code Examples

### Register an Agent

<details>
<summary><b>cURL</b></summary>

```bash
curl -X POST https://api.agentauth.dev/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CustomerSupportAgent",
    "owner_email": "admin@company.com",
    "permissions": ["read:messages", "write:responses"],
    "tier": "free"
  }'
```

</details>

<details>
<summary><b>JavaScript (Node.js)</b></summary>

```javascript
const axios = require('axios');

async function registerAgent() {
  try {
    const response = await axios.post('https://api.agentauth.dev/v1/agents/register', {
      name: 'CustomerSupportAgent',
      owner_email: 'admin@company.com',
      permissions: ['read:messages', 'write:responses'],
      tier: 'free'
    });

    console.log('Agent registered:', response.data);
    console.log('API Key:', response.data.api_key);

    // Save the API key securely!
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Error:', error.response.data);
    } else {
      console.error('Network error:', error.message);
    }
    throw error;
  }
}

registerAgent();
```

</details>

<details>
<summary><b>Python</b></summary>

```python
import requests

def register_agent():
    url = 'https://api.agentauth.dev/v1/agents/register'
    payload = {
        'name': 'CustomerSupportAgent',
        'owner_email': 'admin@company.com',
        'permissions': ['read:messages', 'write:responses'],
        'tier': 'free'
    }

    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()

        data = response.json()
        print('Agent registered:', data)
        print('API Key:', data['api_key'])

        # Save the API key securely!
        return data
    except requests.exceptions.HTTPError as err:
        print('Error:', err.response.json())
        raise
    except requests.exceptions.RequestException as err:
        print('Network error:', err)
        raise

register_agent()
```

</details>

---

### Verify Agent Credentials

<details>
<summary><b>cURL</b></summary>

```bash
curl -X POST https://api.agentauth.dev/v1/agents/verify \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "ag_1a2b3c4d5e6f",
    "api_key": "ag_sk_1a2b3c4d5e6f7g8h9i0j"
  }'
```

</details>

<details>
<summary><b>JavaScript (Node.js)</b></summary>

```javascript
const axios = require('axios');

async function verifyAgent(agentId, apiKey) {
  try {
    const response = await axios.post('https://api.agentauth.dev/v1/agents/verify', {
      agent_id: agentId,
      api_key: apiKey
    });

    if (response.data.valid) {
      console.log('Agent verified:', response.data);
      return response.data;
    } else {
      console.error('Verification failed:', response.data.error);
      return null;
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

// Usage
verifyAgent('ag_1a2b3c4d5e6f', 'ag_sk_1a2b3c4d5e6f7g8h9i0j');
```

</details>

<details>
<summary><b>Python</b></summary>

```python
import requests

def verify_agent(agent_id, api_key):
    url = 'https://api.agentauth.dev/v1/agents/verify'
    payload = {
        'agent_id': agent_id,
        'api_key': api_key
    }

    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()

        data = response.json()
        if data['valid']:
            print('Agent verified:', data)
            return data
        else:
            print('Verification failed:', data.get('error'))
            return None
    except requests.exceptions.RequestException as err:
        print('Error:', err)
        return None

# Usage
verify_agent('ag_1a2b3c4d5e6f', 'ag_sk_1a2b3c4d5e6f7g8h9i0j')
```

</details>

---

### List All Agents

<details>
<summary><b>cURL</b></summary>

```bash
curl -X GET 'https://api.agentauth.dev/v1/agents?limit=50&offset=0&status=active'
```

</details>

<details>
<summary><b>JavaScript (Node.js)</b></summary>

```javascript
const axios = require('axios');

async function listAgents(limit = 50, offset = 0, status = null) {
  try {
    const params = { limit, offset };
    if (status) params.status = status;

    const response = await axios.get('https://api.agentauth.dev/v1/agents', {
      params
    });

    console.log(`Found ${response.data.total} agents`);
    console.log('Agents:', response.data.agents);

    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
listAgents(50, 0, 'active');
```

</details>

<details>
<summary><b>Python</b></summary>

```python
import requests

def list_agents(limit=50, offset=0, status=None):
    url = 'https://api.agentauth.dev/v1/agents'
    params = {'limit': limit, 'offset': offset}
    if status:
        params['status'] = status

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()

        data = response.json()
        print(f"Found {data['total']} agents")
        print('Agents:', data['agents'])

        return data
    except requests.exceptions.RequestException as err:
        print('Error:', err)
        raise

# Usage
list_agents(limit=50, offset=0, status='active')
```

</details>

---

### Create Webhook

<details>
<summary><b>cURL</b></summary>

```bash
curl -X POST https://api.agentauth.dev/v1/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "ag_1a2b3c4d5e6f",
    "url": "https://api.yourapp.com/webhooks/agentauth",
    "events": ["agent.verified", "agent.tier_updated"]
  }'
```

</details>

<details>
<summary><b>JavaScript (Node.js)</b></summary>

```javascript
const axios = require('axios');

async function createWebhook(agentId, webhookUrl, events) {
  try {
    const response = await axios.post('https://api.agentauth.dev/v1/webhooks', {
      agent_id: agentId,
      url: webhookUrl,
      events: events
    });

    console.log('Webhook created:', response.data);
    console.log('Webhook Secret:', response.data.secret);

    // Save the secret securely for signature verification!
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
createWebhook(
  'ag_1a2b3c4d5e6f',
  'https://api.yourapp.com/webhooks/agentauth',
  ['agent.verified', 'agent.tier_updated']
);
```

</details>

<details>
<summary><b>Python</b></summary>

```python
import requests

def create_webhook(agent_id, webhook_url, events):
    url = 'https://api.agentauth.dev/v1/webhooks'
    payload = {
        'agent_id': agent_id,
        'url': webhook_url,
        'events': events
    }

    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()

        data = response.json()
        print('Webhook created:', data)
        print('Webhook Secret:', data['secret'])

        # Save the secret securely for signature verification!
        return data
    except requests.exceptions.RequestException as err:
        print('Error:', err)
        raise

# Usage
create_webhook(
    'ag_1a2b3c4d5e6f',
    'https://api.yourapp.com/webhooks/agentauth',
    ['agent.verified', 'agent.tier_updated']
)
```

</details>

---

### Handle Webhook (Signature Verification)

<details>
<summary><b>JavaScript (Express)</b></summary>

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return `sha256=${expectedSignature}` === signature;
}

app.post('/webhooks/agentauth', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET; // whsec_xxx

  // Verify signature
  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Handle event
  const { event, timestamp, data } = req.body;

  switch (event) {
    case 'agent.verified':
      console.log('Agent verified:', data.agent_id);
      // Your logic here
      break;

    case 'agent.tier_updated':
      console.log('Tier updated:', data.agent_id, '->', data.tier);
      // Your logic here
      break;

    default:
      console.log('Unhandled event:', event);
  }

  res.json({ received: true });
});

app.listen(3000);
```

</details>

<details>
<summary><b>Python (Flask)</b></summary>

```python
from flask import Flask, request, jsonify
import hmac
import hashlib
import json
import os

app = Flask(__name__)

def verify_webhook_signature(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode(),
        json.dumps(payload).encode(),
        hashlib.sha256
    ).hexdigest()

    return f"sha256={expected_signature}" == signature

@app.route('/webhooks/agentauth', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    secret = os.environ.get('WEBHOOK_SECRET')  # whsec_xxx

    # Verify signature
    if not verify_webhook_signature(request.json, signature, secret):
        return jsonify({'error': 'Invalid signature'}), 401

    # Handle event
    event = request.json.get('event')
    timestamp = request.json.get('timestamp')
    data = request.json.get('data')

    if event == 'agent.verified':
        print(f"Agent verified: {data['agent_id']}")
        # Your logic here
    elif event == 'agent.tier_updated':
        print(f"Tier updated: {data['agent_id']} -> {data['tier']}")
        # Your logic here
    else:
        print(f"Unhandled event: {event}")

    return jsonify({'received': True})

if __name__ == '__main__':
    app.run(port=3000)
```

</details>

---

## Support

- **Interactive API Docs:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **OpenAPI Spec:** [openapi.yaml](openapi.yaml)
- **Email Support:** umytbaynazarow754@gmail.com
- **GitHub Issues:** [Agent-Identity Issues](https://github.com/umyt-dev/Agent-Identity/issues)
- **GitHub Discussions:** [Agent-Identity Discussions](https://github.com/umyt-dev/Agent-Identity/discussions)

---

**Last Updated:** January 31, 2026 | AgentAuth v0.5.0
