# AgentAuth API Reference v0.7.0

> **Soul Layer** -- Identity, Integrity, and Drift Detection for AI Agents

---

## Overview

AgentAuth is a production-ready authentication and identity service for AI agents. Version 0.7.0 introduces three major subsystems collectively known as the **Soul Layer**:

- **Persona System** -- define, version, and cryptographically sign an agent's behavioral identity
- **ZKP Anonymous Verification** -- prove agent identity without revealing credentials
- **Anti-Drift Vault** -- detect behavioral drift and auto-revoke rogue agents

### Base URL

| Environment | URL                           |
|-------------|-------------------------------|
| Production  | `https://api.agentauth.dev`   |
| Local       | `http://localhost:3000`       |

### Authentication

Most endpoints require an API key passed via the `X-Api-Key` header:

```
X-Api-Key: ag_sk_your_api_key
```

API keys are issued during agent registration and are only shown once. Store them securely.

### Rate Limits

| Scope                    | Limit                    |
|--------------------------|--------------------------|
| General endpoints        | 100 requests / 15 min    |
| Authentication endpoints | 10 requests / 15 min     |

Rate limit metadata is included in every response via headers:

| Header                  | Description                                  |
|-------------------------|----------------------------------------------|
| `X-RateLimit-Limit`     | Maximum requests allowed in the current window |
| `X-RateLimit-Remaining` | Requests remaining in the current window      |
| `X-RateLimit-Reset`     | Unix timestamp when the window resets          |

When you exceed the limit, the API returns `429 Too Many Requests`.

### Content Type

All request and response bodies use `application/json` unless otherwise noted (e.g., ZIP downloads, CSV exports, multipart uploads).

---

## 1. Agents

Core agent lifecycle: registration, verification, and listing.

### POST /v1/agents/register

Register a new AI agent and receive an API key.

**Rate limit:** 10 requests / 15 min

**Request body:**

| Field          | Type     | Required | Description                              |
|----------------|----------|----------|------------------------------------------|
| `name`         | string   | yes      | Agent name (1-255 chars)                 |
| `owner_email`  | string   | yes      | Owner email address                      |
| `permissions`  | string[] | no       | Permission scopes (default: `[]`)        |
| `tier`         | string   | no       | `free`, `pro`, or `enterprise` (default: `free`) |

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

**Response `201 Created`:**

```json
{
  "agent_id": "ag_1a2b3c4d5e6f",
  "name": "CustomerSupportAgent",
  "owner_email": "admin@company.com",
  "api_key": "ag_sk_1a2b3c4d5e6f7g8h9i0j",
  "tier": "free",
  "permissions": ["read:messages", "write:responses"],
  "created_at": "2026-02-01T12:00:00.000Z"
}
```

> **Important:** The `api_key` value is only returned once. Save it immediately.

### POST /v1/agents/verify

Verify agent credentials and receive agent details.

**Rate limit:** 10 requests / 15 min

```bash
curl -X POST https://api.agentauth.dev/v1/agents/verify \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "ag_1a2b3c4d5e6f",
    "api_key": "ag_sk_1a2b3c4d5e6f7g8h9i0j"
  }'
```

**Response `200 OK`:**

```json
{
  "valid": true,
  "agent_id": "ag_1a2b3c4d5e6f",
  "name": "CustomerSupportAgent",
  "tier": "free",
  "permissions": ["read:messages", "write:responses"],
  "status": "active"
}
```

### GET /v1/agents

List all registered agents with pagination.

| Query Param | Type    | Default | Description                          |
|-------------|---------|---------|--------------------------------------|
| `limit`     | integer | 50      | Max agents to return (1-100)         |
| `offset`    | integer | 0       | Number of agents to skip             |
| `status`    | string  | --      | Filter: `active`, `inactive`, `suspended` |

```bash
curl https://api.agentauth.dev/v1/agents?limit=10&offset=0&status=active
```

**Response `200 OK`:**

```json
{
  "agents": [
    {
      "agent_id": "ag_1a2b3c4d5e6f",
      "name": "CustomerSupportAgent",
      "owner_email": "admin@company.com",
      "tier": "free",
      "status": "active",
      "created_at": "2026-02-01T12:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

---

## 2. Persona (Soul Layer)

The Persona system lets you define an agent's "digital soul" -- a cryptographically signed, versioned behavioral identity. Personas are protected by HMAC-SHA256 integrity hashing, support version history, and can be exported/imported as ZIP bundles.

### POST /v1/agents/:id/persona

Register a new persona for an agent. The persona is signed with HMAC-SHA256 using the agent's API key, creating a tamper-proof identity record.

Fires a `persona.created` webhook event.

**Headers:** `X-Api-Key` (required)

**Request body:**

| Field                                  | Type     | Required | Description                              |
|----------------------------------------|----------|----------|------------------------------------------|
| `persona`                              | object   | yes      | The persona definition (max 10KB)        |
| `persona.version`                      | string   | yes      | Semantic version (e.g., `"1.0.0"`)      |
| `persona.personality`                  | object   | no       | Personality traits and axes              |
| `persona.personality.traits`           | object   | no       | Key-value pairs (numbers 0-1)           |
| `persona.guardrails`                   | object   | no       | Safety boundaries                        |
| `persona.guardrails.toxicity_threshold`| number   | no       | 0-1 toxicity threshold                  |
| `persona.guardrails.hallucination_tolerance` | string | no  | `strict`, `moderate`, or `lenient`      |
| `persona.constraints`                  | object   | no       | Behavioral constraints                   |
| `persona.constraints.forbidden_topics` | string[] | no       | Topics the agent must avoid             |
| `persona.constraints.max_response_length` | integer | no    | Maximum response length in chars        |

#### cURL

```bash
curl -X POST https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: ag_sk_your_api_key" \
  -d '{
    "persona": {
      "version": "1.0.0",
      "personality": {
        "traits": {
          "helpfulness": 0.9,
          "formality": 0.7,
          "creativity": 0.6,
          "empathy": 0.85
        }
      },
      "guardrails": {
        "toxicity_threshold": 0.3,
        "hallucination_tolerance": "strict",
        "source_citation_required": true
      },
      "constraints": {
        "forbidden_topics": ["politics", "religion", "medical_advice"],
        "required_disclaimers": ["I am an AI assistant."],
        "max_response_length": 2000
      }
    }
  }'
```

#### JavaScript (fetch)

```javascript
const response = await fetch(
  "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": "ag_sk_your_api_key",
    },
    body: JSON.stringify({
      persona: {
        version: "1.0.0",
        personality: {
          traits: {
            helpfulness: 0.9,
            formality: 0.7,
            creativity: 0.6,
            empathy: 0.85,
          },
        },
        guardrails: {
          toxicity_threshold: 0.3,
          hallucination_tolerance: "strict",
          source_citation_required: true,
        },
        constraints: {
          forbidden_topics: ["politics", "religion", "medical_advice"],
          required_disclaimers: ["I am an AI assistant."],
          max_response_length: 2000,
        },
      },
    }),
  }
);

const data = await response.json();
console.log(data);
```

#### Python (requests)

```python
import requests

response = requests.post(
    "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona",
    headers={
        "Content-Type": "application/json",
        "X-Api-Key": "ag_sk_your_api_key",
    },
    json={
        "persona": {
            "version": "1.0.0",
            "personality": {
                "traits": {
                    "helpfulness": 0.9,
                    "formality": 0.7,
                    "creativity": 0.6,
                    "empathy": 0.85,
                }
            },
            "guardrails": {
                "toxicity_threshold": 0.3,
                "hallucination_tolerance": "strict",
                "source_citation_required": True,
            },
            "constraints": {
                "forbidden_topics": ["politics", "religion", "medical_advice"],
                "required_disclaimers": ["I am an AI assistant."],
                "max_response_length": 2000,
            },
        }
    },
)

print(response.json())
```

**Response `201 Created`:**

```json
{
  "agent_id": "ag_1a2b3c4d5e6f",
  "persona_version": "1.0.0",
  "persona_hash": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "created_at": "2026-02-01T12:00:00.000Z"
}
```

**Error responses:**

| Status | Condition                                |
|--------|------------------------------------------|
| `400`  | Missing `persona` or `persona.version`   |
| `401`  | Invalid or missing `X-Api-Key`           |
| `409`  | Persona already exists (use PUT to update) |
| `413`  | Persona exceeds 10KB size limit          |

---

### GET /v1/agents/:id/persona

Retrieve the current persona for an agent. Supports ETag-based caching and optional system prompt generation.

**Query parameters:**

| Param            | Type    | Default | Description                                |
|------------------|---------|---------|--------------------------------------------|
| `include_prompt` | boolean | `false` | Include the auto-generated system prompt   |

**Caching:** The response includes an `ETag` header. On subsequent requests, pass the ETag value in `If-None-Match` to receive a `304 Not Modified` if the persona has not changed.

#### cURL

```bash
# Basic request
curl https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona

# With system prompt
curl "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona?include_prompt=true"

# With ETag caching
curl https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona \
  -H "If-None-Match: \"a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2\""
```

#### JavaScript (fetch)

```javascript
// Basic request with system prompt
const response = await fetch(
  "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona?include_prompt=true"
);

const etag = response.headers.get("ETag");
const data = await response.json();
console.log(data);

// Subsequent request with ETag caching
const cached = await fetch(
  "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona",
  {
    headers: { "If-None-Match": etag },
  }
);

if (cached.status === 304) {
  console.log("Persona unchanged, use cached version");
} else {
  const updated = await cached.json();
  console.log("Persona updated:", updated);
}
```

#### Python (requests)

```python
import requests

# Fetch persona with system prompt
response = requests.get(
    "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona",
    params={"include_prompt": "true"},
)

etag = response.headers.get("ETag")
persona = response.json()
print(persona)

# Subsequent request with ETag caching
cached = requests.get(
    "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona",
    headers={"If-None-Match": etag},
)

if cached.status_code == 304:
    print("Persona unchanged, use cached version")
else:
    print("Persona updated:", cached.json())
```

**Response `200 OK`:**

```json
{
  "agent_id": "ag_1a2b3c4d5e6f",
  "persona": {
    "version": "1.0.0",
    "personality": {
      "traits": {
        "helpfulness": 0.9,
        "formality": 0.7,
        "creativity": 0.6,
        "empathy": 0.85
      }
    },
    "guardrails": {
      "toxicity_threshold": 0.3,
      "hallucination_tolerance": "strict",
      "source_citation_required": true
    },
    "constraints": {
      "forbidden_topics": ["politics", "religion", "medical_advice"],
      "required_disclaimers": ["I am an AI assistant."],
      "max_response_length": 2000
    }
  },
  "persona_version": "1.0.0",
  "persona_hash": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "prompt": "You are an AI agent with the following persona..."
}
```

**Response `304 Not Modified`:** (empty body when ETag matches)

---

### PUT /v1/agents/:id/persona

Update an existing persona. The version is auto-bumped (minor) unless a higher explicit version is provided. Previous versions are preserved in history.

Fires a `persona.updated` webhook event.

**Headers:** `X-Api-Key` (required)

#### cURL

```bash
curl -X PUT https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: ag_sk_your_api_key" \
  -d '{
    "persona": {
      "version": "1.1.0",
      "personality": {
        "traits": {
          "helpfulness": 0.95,
          "formality": 0.8,
          "creativity": 0.6,
          "empathy": 0.9
        }
      },
      "guardrails": {
        "toxicity_threshold": 0.2,
        "hallucination_tolerance": "strict",
        "source_citation_required": true
      },
      "constraints": {
        "forbidden_topics": ["politics", "religion", "medical_advice", "legal_advice"],
        "required_disclaimers": ["I am an AI assistant.", "This is not professional advice."],
        "max_response_length": 3000
      }
    }
  }'
```

#### JavaScript (fetch)

```javascript
const response = await fetch(
  "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona",
  {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": "ag_sk_your_api_key",
    },
    body: JSON.stringify({
      persona: {
        version: "1.1.0",
        personality: {
          traits: {
            helpfulness: 0.95,
            formality: 0.8,
            creativity: 0.6,
            empathy: 0.9,
          },
        },
        guardrails: {
          toxicity_threshold: 0.2,
          hallucination_tolerance: "strict",
          source_citation_required: true,
        },
        constraints: {
          forbidden_topics: ["politics", "religion", "medical_advice", "legal_advice"],
          required_disclaimers: ["I am an AI assistant.", "This is not professional advice."],
          max_response_length: 3000,
        },
      },
    }),
  }
);

const data = await response.json();
console.log(data);
```

#### Python (requests)

```python
import requests

response = requests.put(
    "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona",
    headers={
        "Content-Type": "application/json",
        "X-Api-Key": "ag_sk_your_api_key",
    },
    json={
        "persona": {
            "version": "1.1.0",
            "personality": {
                "traits": {
                    "helpfulness": 0.95,
                    "formality": 0.8,
                    "creativity": 0.6,
                    "empathy": 0.9,
                }
            },
            "guardrails": {
                "toxicity_threshold": 0.2,
                "hallucination_tolerance": "strict",
                "source_citation_required": True,
            },
            "constraints": {
                "forbidden_topics": ["politics", "religion", "medical_advice", "legal_advice"],
                "required_disclaimers": ["I am an AI assistant.", "This is not professional advice."],
                "max_response_length": 3000,
            },
        }
    },
)

print(response.json())
```

**Response `200 OK`:**

```json
{
  "agent_id": "ag_1a2b3c4d5e6f",
  "persona_version": "1.1.0",
  "persona_hash": "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
  "created_at": "2026-02-01T14:30:00.000Z"
}
```

---

### POST /v1/agents/:id/persona/verify

Re-compute the HMAC-SHA256 hash of the stored persona and compare it with the stored hash. This detects any tampering of the persona data at rest.

**Headers:** `X-Api-Key` (required)

#### cURL

```bash
curl -X POST https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona/verify \
  -H "X-Api-Key: ag_sk_your_api_key"
```

#### JavaScript (fetch)

```javascript
const response = await fetch(
  "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona/verify",
  {
    method: "POST",
    headers: {
      "X-Api-Key": "ag_sk_your_api_key",
    },
  }
);

const result = await response.json();

if (result.valid) {
  console.log("Persona integrity verified:", result.persona_version);
} else {
  console.error("INTEGRITY VIOLATION:", result.reason);
}
```

#### Python (requests)

```python
import requests

response = requests.post(
    "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona/verify",
    headers={"X-Api-Key": "ag_sk_your_api_key"},
)

result = response.json()

if result["valid"]:
    print(f"Persona integrity verified: v{result['persona_version']}")
else:
    print(f"INTEGRITY VIOLATION: {result['reason']}")
```

**Response `200 OK` (valid):**

```json
{
  "valid": true,
  "reason": "Hash matches stored persona",
  "agent_id": "ag_1a2b3c4d5e6f",
  "persona_version": "1.1.0"
}
```

**Response `200 OK` (tampered):**

```json
{
  "valid": false,
  "reason": "Hash mismatch — persona may have been tampered with",
  "agent_id": "ag_1a2b3c4d5e6f",
  "persona_version": "1.1.0"
}
```

---

### GET /v1/agents/:id/persona/history

Retrieve the version history of all persona changes. Supports pagination and CSV export.

**Query parameters:**

| Param    | Type    | Default | Description                       |
|----------|---------|---------|-----------------------------------|
| `limit`  | integer | 20      | Max entries to return (1-100)     |
| `offset` | integer | 0       | Number of entries to skip         |
| `format` | string  | `json`  | Response format: `json` or `csv` |

#### cURL

```bash
# JSON (default)
curl "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona/history?limit=10&offset=0"

# CSV export
curl "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona/history?format=csv"
```

#### JavaScript (fetch)

```javascript
// JSON format with pagination
const response = await fetch(
  "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona/history?limit=10&offset=0"
);
const data = await response.json();
console.log(`Total versions: ${data.total}`);
data.history.forEach((entry) => {
  console.log(`  v${entry.persona_version} - ${entry.changed_at}`);
});

// CSV export
const csv = await fetch(
  "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona/history?format=csv"
);
const csvText = await csv.text();
console.log(csvText);
```

#### Python (requests)

```python
import requests

# JSON format with pagination
response = requests.get(
    "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona/history",
    params={"limit": 10, "offset": 0},
)

data = response.json()
print(f"Total versions: {data['total']}")
for entry in data["history"]:
    print(f"  v{entry['persona_version']} - {entry['changed_at']}")

# CSV export
csv_response = requests.get(
    "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona/history",
    params={"format": "csv"},
)
print(csv_response.text)
```

**Response `200 OK` (JSON):**

```json
{
  "history": [
    {
      "id": 2,
      "persona_version": "1.1.0",
      "persona_hash": "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
      "changed_at": "2026-02-01T14:30:00.000Z"
    },
    {
      "id": 1,
      "persona_version": "1.0.0",
      "persona_hash": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      "changed_at": "2026-02-01T12:00:00.000Z"
    }
  ],
  "total": 2
}
```

**Response `200 OK` (CSV):**

```
version,hash,changed_at
1.1.0,b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3,2026-02-01T14:30:00.000Z
1.0.0,a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2,2026-02-01T12:00:00.000Z
```

---

### GET /v1/agents/:id/persona/export

Download a ZIP archive containing the persona JSON, metadata, and integrity hash. Useful for backup or migration to another agent.

**Headers:** `X-Api-Key` (required)

**Response content type:** `application/zip`

#### cURL

```bash
curl -O -J https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona/export \
  -H "X-Api-Key: ag_sk_your_api_key"
```

#### JavaScript (fetch)

```javascript
const response = await fetch(
  "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona/export",
  {
    headers: {
      "X-Api-Key": "ag_sk_your_api_key",
    },
  }
);

const blob = await response.blob();
const url = URL.createObjectURL(blob);

// Trigger download in browser
const a = document.createElement("a");
a.href = url;
a.download = "persona-ag_1a2b3c4d5e6f.zip";
a.click();
URL.revokeObjectURL(url);

// Or in Node.js, write to file
// const fs = require("fs");
// const buffer = Buffer.from(await response.arrayBuffer());
// fs.writeFileSync("persona-export.zip", buffer);
```

#### Python (requests)

```python
import requests

response = requests.get(
    "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona/export",
    headers={"X-Api-Key": "ag_sk_your_api_key"},
)

with open("persona-ag_1a2b3c4d5e6f.zip", "wb") as f:
    f.write(response.content)

print(f"Exported {len(response.content)} bytes")
```

**Response `200 OK`:** Binary ZIP file containing:

```
persona-bundle/
  persona.json      # The full persona definition
  metadata.json     # Agent ID, version, hash, timestamps
  integrity.sha256  # HMAC-SHA256 hash for verification
```

---

### POST /v1/agents/:id/persona/import

Import a persona from a previously exported ZIP bundle. The persona is re-signed with the target agent's API key.

**Headers:** `X-Api-Key` (required)

**Content type:** `multipart/form-data`

| Field    | Type   | Required | Description                  |
|----------|--------|----------|------------------------------|
| `bundle` | file   | yes      | ZIP file from persona export |

#### cURL

```bash
curl -X POST https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona/import \
  -H "X-Api-Key: ag_sk_your_api_key" \
  -F "bundle=@persona-ag_1a2b3c4d5e6f.zip"
```

#### JavaScript (fetch)

```javascript
const formData = new FormData();
formData.append("bundle", fileInput.files[0]);

const response = await fetch(
  "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona/import",
  {
    method: "POST",
    headers: {
      "X-Api-Key": "ag_sk_your_api_key",
    },
    body: formData,
  }
);

const data = await response.json();
console.log("Imported persona:", data.persona_version);
```

#### Python (requests)

```python
import requests

with open("persona-ag_1a2b3c4d5e6f.zip", "rb") as f:
    response = requests.post(
        "https://api.agentauth.dev/v1/agents/ag_1a2b3c4d5e6f/persona/import",
        headers={"X-Api-Key": "ag_sk_your_api_key"},
        files={"bundle": ("persona-bundle.zip", f, "application/zip")},
    )

print(response.json())
```

**Response `201 Created`:**

```json
{
  "agent_id": "ag_1a2b3c4d5e6f",
  "persona_version": "1.1.0",
  "persona_hash": "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  "created_at": "2026-02-01T15:00:00.000Z"
}
```

---

## 3. ZKP Anonymous Verification

Zero-Knowledge Proof (ZKP) anonymous verification allows agents to prove they hold valid credentials without revealing their identity. Supports both a fast hash-based mode and a full Groth16 cryptographic proof mode.

### POST /v1/zkp/register-commitment

Generate and store a SHA-256 commitment for anonymous verification. Requires valid agent credentials in the request body.

**Request body:**

| Field        | Type    | Required | Description                         |
|--------------|---------|----------|-------------------------------------|
| `agent_id`   | string  | yes      | The agent's ID                      |
| `api_key`    | string  | yes      | The agent's API key                 |
| `expires_in` | integer | no       | TTL in seconds (omit for no expiry) |

#### cURL

```bash
curl -X POST https://api.agentauth.dev/v1/zkp/register-commitment \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "ag_1a2b3c4d5e6f",
    "api_key": "ag_sk_your_api_key",
    "expires_in": 86400
  }'
```

#### JavaScript (fetch)

```javascript
const response = await fetch(
  "https://api.agentauth.dev/v1/zkp/register-commitment",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_id: "ag_1a2b3c4d5e6f",
      api_key: "ag_sk_your_api_key",
      expires_in: 86400,
    }),
  }
);

const data = await response.json();
console.log("Commitment:", data.commitment);
console.log("Salt (SAVE THIS):", data.salt);
console.log("Expires:", data.expires_at);
```

#### Python (requests)

```python
import requests

response = requests.post(
    "https://api.agentauth.dev/v1/zkp/register-commitment",
    json={
        "agent_id": "ag_1a2b3c4d5e6f",
        "api_key": "ag_sk_your_api_key",
        "expires_in": 86400,
    },
)

data = response.json()
print(f"Commitment: {data['commitment']}")
print(f"Salt (SAVE THIS): {data['salt']}")
print(f"Expires: {data['expires_at']}")
```

**Response `201 Created`:**

```json
{
  "commitment": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "salt": "f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2",
  "expires_at": "2026-02-02T12:00:00.000Z",
  "message": "Store the salt securely — it will not be shown again."
}
```

> **Important:** The `salt` is only returned once. Store it securely alongside the commitment.

---

### POST /v1/zkp/verify-anonymous?mode=hash

Verify a commitment using hash-based mode. This is the faster verification method -- you provide the SHA-256 of `agentId:apiKey:salt` as the `preimage_hash`.

**Query parameters:**

| Param  | Type   | Value  | Description           |
|--------|--------|--------|-----------------------|
| `mode` | string | `hash` | Use hash-based verify |

**Request body:**

| Field           | Type   | Required | Description                                   |
|-----------------|--------|----------|-----------------------------------------------|
| `commitment`    | string | yes      | The commitment hex string (64+ chars)         |
| `preimage_hash` | string | yes      | SHA-256 of `"agentId:apiKey:salt"`            |

#### cURL

```bash
curl -X POST "https://api.agentauth.dev/v1/zkp/verify-anonymous?mode=hash" \
  -H "Content-Type: application/json" \
  -d '{
    "commitment": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    "preimage_hash": "abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234"
  }'
```

#### JavaScript (fetch)

```javascript
// First, compute the preimage hash client-side
const encoder = new TextEncoder();
const preimage = encoder.encode("ag_1a2b3c4d5e6f:ag_sk_your_api_key:your_salt_here");
const hashBuffer = await crypto.subtle.digest("SHA-256", preimage);
const hashArray = Array.from(new Uint8Array(hashBuffer));
const preimageHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

// Then verify anonymously
const response = await fetch(
  "https://api.agentauth.dev/v1/zkp/verify-anonymous?mode=hash",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commitment: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      preimage_hash: preimageHash,
    }),
  }
);

const result = await response.json();
console.log("Valid:", result.valid);
console.log("Permissions:", result.permissions);
console.log("Tier:", result.tier);
```

#### Python (requests)

```python
import hashlib
import requests

# Compute preimage hash
preimage = "ag_1a2b3c4d5e6f:ag_sk_your_api_key:your_salt_here"
preimage_hash = hashlib.sha256(preimage.encode()).hexdigest()

# Verify anonymously
response = requests.post(
    "https://api.agentauth.dev/v1/zkp/verify-anonymous",
    params={"mode": "hash"},
    json={
        "commitment": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
        "preimage_hash": preimage_hash,
    },
)

result = response.json()
print(f"Valid: {result['valid']}")
if result["valid"]:
    print(f"Permissions: {result['permissions']}")
    print(f"Tier: {result['tier']}")
```

**Response `200 OK` (valid):**

```json
{
  "valid": true,
  "reason": "Commitment verified via hash mode",
  "permissions": ["read:messages", "write:responses"],
  "tier": "pro"
}
```

**Response `200 OK` (invalid):**

```json
{
  "valid": false,
  "reason": "Preimage hash does not match commitment"
}
```

---

### POST /v1/zkp/verify-anonymous?mode=zkp

Verify a commitment using a full Groth16 zero-knowledge proof. The first public signal must equal the commitment.

**Query parameters:**

| Param  | Type   | Value | Description                    |
|--------|--------|-------|--------------------------------|
| `mode` | string | `zkp` | Use Groth16 proof verification |

**Request body:**

| Field                | Type     | Required | Description                                     |
|----------------------|----------|----------|-------------------------------------------------|
| `commitment`         | string   | yes      | The commitment hex string                       |
| `proof`              | object   | yes      | Groth16 proof object                            |
| `proof.pi_a`         | string[] | yes      | Proof element A                                 |
| `proof.pi_b`         | array[]  | yes      | Proof element B (nested arrays)                 |
| `proof.pi_c`         | string[] | yes      | Proof element C                                 |
| `proof.protocol`     | string   | no       | `"groth16"` (default)                           |
| `proof.curve`        | string   | no       | `"bn128"` or `"bls12381"`                       |
| `publicSignals`      | string[] | yes      | Public signals; first must equal the commitment |

#### cURL

```bash
curl -X POST "https://api.agentauth.dev/v1/zkp/verify-anonymous?mode=zkp" \
  -H "Content-Type: application/json" \
  -d '{
    "commitment": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    "proof": {
      "pi_a": ["0x1234abcd...", "0x5678efab...", "1"],
      "pi_b": [["0xabcdef01...", "0x23456789..."], ["0xfedcba98...", "0x76543210..."]],
      "pi_c": ["0xaaaa1111...", "0xbbbb2222...", "1"],
      "protocol": "groth16",
      "curve": "bn128"
    },
    "publicSignals": [
      "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
    ]
  }'
```

#### JavaScript (fetch)

```javascript
const response = await fetch(
  "https://api.agentauth.dev/v1/zkp/verify-anonymous?mode=zkp",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commitment: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      proof: {
        pi_a: ["0x1234abcd...", "0x5678efab...", "1"],
        pi_b: [
          ["0xabcdef01...", "0x23456789..."],
          ["0xfedcba98...", "0x76543210..."],
        ],
        pi_c: ["0xaaaa1111...", "0xbbbb2222...", "1"],
        protocol: "groth16",
        curve: "bn128",
      },
      publicSignals: [
        "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      ],
    }),
  }
);

const result = await response.json();
console.log("ZKP verification:", result.valid ? "PASSED" : "FAILED");
```

#### Python (requests)

```python
import requests

response = requests.post(
    "https://api.agentauth.dev/v1/zkp/verify-anonymous",
    params={"mode": "zkp"},
    json={
        "commitment": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
        "proof": {
            "pi_a": ["0x1234abcd...", "0x5678efab...", "1"],
            "pi_b": [
                ["0xabcdef01...", "0x23456789..."],
                ["0xfedcba98...", "0x76543210..."],
            ],
            "pi_c": ["0xaaaa1111...", "0xbbbb2222...", "1"],
            "protocol": "groth16",
            "curve": "bn128",
        },
        "publicSignals": [
            "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
        ],
    },
)

result = response.json()
print(f"ZKP verification: {'PASSED' if result['valid'] else 'FAILED'}")
```

**Response `200 OK` (valid):**

```json
{
  "valid": true,
  "reason": "Zero-knowledge proof verified successfully",
  "permissions": ["read:messages", "write:responses"],
  "tier": "pro"
}
```

> **Note:** The response includes `Cache-Control: no-store` to prevent caching of verification results.

---

### DELETE /v1/zkp/commitment/:commitment

Revoke a commitment so it can no longer be used for anonymous verification.

#### cURL

```bash
curl -X DELETE https://api.agentauth.dev/v1/zkp/commitment/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

#### JavaScript (fetch)

```javascript
const commitment = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

const response = await fetch(
  `https://api.agentauth.dev/v1/zkp/commitment/${commitment}`,
  { method: "DELETE" }
);

const data = await response.json();
console.log(data.message); // "Commitment revoked"
```

#### Python (requests)

```python
import requests

commitment = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"

response = requests.delete(
    f"https://api.agentauth.dev/v1/zkp/commitment/{commitment}"
)

data = response.json()
print(data["message"])  # "Commitment revoked"
```

**Response `200 OK`:**

```json
{
  "message": "Commitment revoked",
  "commitment": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "status": "revoked"
}
```

---

### GET /v1/zkp/active-count

Return the number of currently active (non-revoked, non-expired) commitments.

#### cURL

```bash
curl https://api.agentauth.dev/v1/zkp/active-count
```

#### JavaScript (fetch)

```javascript
const response = await fetch("https://api.agentauth.dev/v1/zkp/active-count");
const data = await response.json();
console.log(`Active commitments: ${data.count}`);
```

#### Python (requests)

```python
import requests

response = requests.get("https://api.agentauth.dev/v1/zkp/active-count")
data = response.json()
print(f"Active commitments: {data['count']}")
```

**Response `200 OK`:**

```json
{
  "count": 42
}
```

---

## 4. Anti-Drift Vault

The Anti-Drift Vault monitors agent behavioral metrics over time, computes a drift score relative to a configured baseline, fires warning webhooks, and can auto-revoke agents that exceed thresholds.

**Drift score:** A value between 0.0 (no drift) and 1.0 (maximum drift), calculated as a weighted average of metric deltas from the baseline.

**Thresholds:**

| Level    | Default | Behavior                                |
|----------|---------|-----------------------------------------|
| Warning  | 0.5     | Fires `agent.drift.warning` webhook     |
| Critical | 0.7     | Auto-revokes agent if `auto_revoke` is enabled, fires `agent.drift.revoked` webhook |

### POST /v1/drift/:id/health-ping

Submit a health ping with behavioral metrics. The drift score is computed against the configured baseline. If the score exceeds thresholds, warnings are fired and the agent may be auto-revoked.

**Headers:**
- `X-Api-Key` (required)
- `X-Ping-Signature` (optional) -- HMAC-SHA256 signature of the request body for payload verification

**Request body:**

| Field          | Type    | Required | Description                              |
|----------------|---------|----------|------------------------------------------|
| `metrics`      | object  | yes      | Key-value behavioral metrics (finite numbers) |
| `request_count`| integer | no       | Number of requests in this period        |
| `period_start` | string  | no       | ISO 8601 start of the reporting period   |
| `period_end`   | string  | no       | ISO 8601 end of the reporting period     |

#### cURL

```bash
curl -X POST https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/health-ping \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: ag_sk_your_api_key" \
  -H "X-Ping-Signature: sha256=e5b7c8d9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7" \
  -d '{
    "metrics": {
      "response_time": 0.45,
      "error_rate": 0.02,
      "toxicity_score": 0.05,
      "hallucination_rate": 0.01,
      "request_count": 150
    },
    "request_count": 150,
    "period_start": "2026-02-01T11:00:00.000Z",
    "period_end": "2026-02-01T12:00:00.000Z"
  }'
```

#### JavaScript (fetch)

```javascript
const body = JSON.stringify({
  metrics: {
    response_time: 0.45,
    error_rate: 0.02,
    toxicity_score: 0.05,
    hallucination_rate: 0.01,
    request_count: 150,
  },
  request_count: 150,
  period_start: "2026-02-01T11:00:00.000Z",
  period_end: "2026-02-01T12:00:00.000Z",
});

// Optional: compute HMAC signature for payload verification
const encoder = new TextEncoder();
const key = await crypto.subtle.importKey(
  "raw",
  encoder.encode("ag_sk_your_api_key"),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign"]
);
const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
const sigHex = Array.from(new Uint8Array(sig))
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("");

const response = await fetch(
  "https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/health-ping",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": "ag_sk_your_api_key",
      "X-Ping-Signature": `sha256=${sigHex}`,
    },
    body,
  }
);

const data = await response.json();
console.log(`Drift score: ${data.drift_score}`);
console.log(`Status: ${data.status}`);
if (data.spikes.length > 0) {
  console.warn("Spikes detected:", data.spikes);
}
```

#### Python (requests)

```python
import hmac
import hashlib
import json
import requests

body = {
    "metrics": {
        "response_time": 0.45,
        "error_rate": 0.02,
        "toxicity_score": 0.05,
        "hallucination_rate": 0.01,
        "request_count": 150,
    },
    "request_count": 150,
    "period_start": "2026-02-01T11:00:00.000Z",
    "period_end": "2026-02-01T12:00:00.000Z",
}

# Optional: compute HMAC signature
body_str = json.dumps(body, separators=(",", ":"))
signature = hmac.new(
    b"ag_sk_your_api_key", body_str.encode(), hashlib.sha256
).hexdigest()

response = requests.post(
    "https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/health-ping",
    headers={
        "X-Api-Key": "ag_sk_your_api_key",
        "X-Ping-Signature": f"sha256={signature}",
    },
    json=body,
)

data = response.json()
print(f"Drift score: {data['drift_score']}")
print(f"Status: {data['status']}")
if data["spikes"]:
    print(f"Spikes detected: {data['spikes']}")
```

**Response `201 Created` (healthy):**

```json
{
  "ping_id": 1,
  "agent_id": "ag_1a2b3c4d5e6f",
  "drift_score": 0.12,
  "spikes": [],
  "status": "healthy",
  "message": "Health ping recorded"
}
```

**Response `201 Created` (warning):**

```json
{
  "ping_id": 42,
  "agent_id": "ag_1a2b3c4d5e6f",
  "drift_score": 0.63,
  "spikes": ["toxicity_score"],
  "status": "warning",
  "message": "Drift warning — toxicity_score spiked"
}
```

**Response `201 Created` (revoked):**

```json
{
  "ping_id": 99,
  "agent_id": "ag_1a2b3c4d5e6f",
  "drift_score": 0.85,
  "spikes": ["toxicity_score", "hallucination_rate"],
  "status": "revoked",
  "message": "Agent auto-revoked due to excessive drift"
}
```

**Error responses:**

| Status | Condition                                 |
|--------|-------------------------------------------|
| `400`  | Missing `metrics` or invalid metric values |
| `401`  | Invalid or missing `X-Api-Key`            |
| `403`  | Agent is inactive or already revoked       |

---

### GET /v1/drift/:id/drift-score

Retrieve the current drift score, trend, and status for an agent.

#### cURL

```bash
curl https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-score
```

#### JavaScript (fetch)

```javascript
const response = await fetch(
  "https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-score"
);

const data = await response.json();
console.log(`Drift score: ${data.drift_score}`);
console.log(`Trend: ${data.trend}`);
console.log(`Status: ${data.status}`);
console.log(`Last ping: ${data.last_ping_at}`);
```

#### Python (requests)

```python
import requests

response = requests.get(
    "https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-score"
)

data = response.json()
print(f"Drift score: {data['drift_score']}")
print(f"Trend: {data['trend']}")      # "improving", "stable", or "worsening"
print(f"Status: {data['status']}")     # "healthy", "warning", or "critical"
print(f"Last ping: {data['last_ping_at']}")
```

**Response `200 OK`:**

```json
{
  "agent_id": "ag_1a2b3c4d5e6f",
  "drift_score": 0.12,
  "trend": "improving",
  "last_ping_at": "2026-02-01T12:00:00.000Z",
  "status": "healthy"
}
```

**Trend values:**

| Value       | Description                                |
|-------------|--------------------------------------------|
| `improving` | Drift score is decreasing over recent pings |
| `stable`    | Drift score is roughly unchanged           |
| `worsening` | Drift score is increasing over recent pings |

---

### GET /v1/drift/:id/drift-history

Retrieve paginated drift score history. Supports CSV export and single-metric filtering.

**Query parameters:**

| Param    | Type    | Default | Description                                |
|----------|---------|---------|--------------------------------------------|
| `limit`  | integer | 50      | Max entries to return (1-200)              |
| `offset` | integer | 0       | Number of entries to skip                  |
| `metric` | string  | --      | Filter by a single metric name             |
| `format` | string  | `json`  | Response format: `json` or `csv`           |

#### cURL

```bash
# Full history with pagination
curl "https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-history?limit=20&offset=0"

# Filter by single metric
curl "https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-history?metric=toxicity_score"

# CSV export
curl "https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-history?format=csv"

# Combined: filter + CSV
curl "https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-history?metric=error_rate&format=csv"
```

#### JavaScript (fetch)

```javascript
// JSON with metric filter
const response = await fetch(
  "https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-history?metric=toxicity_score&limit=20"
);
const data = await response.json();

console.log(`Total records: ${data.total}`);
data.history.forEach((entry) => {
  console.log(
    `  [${entry.created_at}] score=${entry.drift_score} spikes=${entry.spikes.join(",") || "none"}`
  );
});

// CSV export
const csvResponse = await fetch(
  "https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-history?format=csv"
);
const csvText = await csvResponse.text();
console.log(csvText);
```

#### Python (requests)

```python
import requests

# JSON with metric filter
response = requests.get(
    "https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-history",
    params={"metric": "toxicity_score", "limit": 20},
)

data = response.json()
print(f"Total records: {data['total']}")
for entry in data["history"]:
    spikes = ", ".join(entry["spikes"]) if entry["spikes"] else "none"
    print(f"  [{entry['created_at']}] score={entry['drift_score']} spikes={spikes}")

# CSV export
csv_response = requests.get(
    "https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-history",
    params={"format": "csv"},
)
print(csv_response.text)
```

**Response `200 OK` (JSON):**

```json
{
  "history": [
    {
      "id": 3,
      "drift_score": 0.12,
      "metrics": {
        "response_time": 0.45,
        "error_rate": 0.02,
        "toxicity_score": 0.05,
        "hallucination_rate": 0.01
      },
      "spikes": [],
      "created_at": "2026-02-01T12:00:00.000Z"
    },
    {
      "id": 2,
      "drift_score": 0.34,
      "metrics": {
        "response_time": 0.52,
        "error_rate": 0.05,
        "toxicity_score": 0.15,
        "hallucination_rate": 0.03
      },
      "spikes": ["toxicity_score"],
      "created_at": "2026-02-01T11:00:00.000Z"
    }
  ],
  "total": 2
}
```

---

### PUT /v1/drift/:id/drift-config

Configure drift thresholds, metric weights, auto-revoke behavior, spike sensitivity, and baseline metrics.

**Headers:** `X-Api-Key` (required)

**Request body:**

| Field               | Type    | Description                                                |
|---------------------|---------|------------------------------------------------------------|
| `drift_threshold`   | number  | Score above which agent is considered drifted (0-1)        |
| `warning_threshold` | number  | Score above which a warning webhook fires (0-1, must be < `drift_threshold`) |
| `auto_revoke`       | boolean | Auto-revoke agent when drift exceeds threshold             |
| `spike_sensitivity` | number  | Standard deviations for spike detection (default: 2.0, must be > 0) |
| `metric_weights`    | object  | Per-metric weights for drift score calculation             |
| `baseline_metrics`  | object  | Expected baseline metric values                            |

#### cURL

```bash
curl -X PUT https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-config \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: ag_sk_your_api_key" \
  -d '{
    "drift_threshold": 0.7,
    "warning_threshold": 0.5,
    "auto_revoke": true,
    "spike_sensitivity": 2.0,
    "metric_weights": {
      "toxicity_score": 3.0,
      "hallucination_rate": 2.0,
      "error_rate": 1.0,
      "response_time": 0.5
    },
    "baseline_metrics": {
      "response_time": 0.3,
      "error_rate": 0.01,
      "toxicity_score": 0.02,
      "hallucination_rate": 0.005
    }
  }'
```

#### JavaScript (fetch)

```javascript
const response = await fetch(
  "https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-config",
  {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": "ag_sk_your_api_key",
    },
    body: JSON.stringify({
      drift_threshold: 0.7,
      warning_threshold: 0.5,
      auto_revoke: true,
      spike_sensitivity: 2.0,
      metric_weights: {
        toxicity_score: 3.0,
        hallucination_rate: 2.0,
        error_rate: 1.0,
        response_time: 0.5,
      },
      baseline_metrics: {
        response_time: 0.3,
        error_rate: 0.01,
        toxicity_score: 0.02,
        hallucination_rate: 0.005,
      },
    }),
  }
);

const config = await response.json();
console.log("Config updated:", config);
```

#### Python (requests)

```python
import requests

response = requests.put(
    "https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-config",
    headers={"X-Api-Key": "ag_sk_your_api_key"},
    json={
        "drift_threshold": 0.7,
        "warning_threshold": 0.5,
        "auto_revoke": True,
        "spike_sensitivity": 2.0,
        "metric_weights": {
            "toxicity_score": 3.0,
            "hallucination_rate": 2.0,
            "error_rate": 1.0,
            "response_time": 0.5,
        },
        "baseline_metrics": {
            "response_time": 0.3,
            "error_rate": 0.01,
            "toxicity_score": 0.02,
            "hallucination_rate": 0.005,
        },
    },
)

print(response.json())
```

**Response `200 OK`:**

```json
{
  "agent_id": "ag_1a2b3c4d5e6f",
  "drift_threshold": 0.7,
  "warning_threshold": 0.5,
  "auto_revoke": true,
  "spike_sensitivity": 2.0,
  "metric_weights": {
    "toxicity_score": 3.0,
    "hallucination_rate": 2.0,
    "error_rate": 1.0,
    "response_time": 0.5
  },
  "baseline_metrics": {
    "response_time": 0.3,
    "error_rate": 0.01,
    "toxicity_score": 0.02,
    "hallucination_rate": 0.005
  },
  "updated_at": "2026-02-01T12:30:00.000Z"
}
```

---

### GET /v1/drift/:id/drift-config

Retrieve the current drift configuration for an agent.

#### cURL

```bash
curl https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-config
```

#### JavaScript (fetch)

```javascript
const response = await fetch(
  "https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-config"
);

const config = await response.json();
console.log(`Drift threshold: ${config.drift_threshold}`);
console.log(`Warning threshold: ${config.warning_threshold}`);
console.log(`Auto-revoke: ${config.auto_revoke}`);
console.log(`Metric weights:`, config.metric_weights);
```

#### Python (requests)

```python
import requests

response = requests.get(
    "https://api.agentauth.dev/v1/drift/ag_1a2b3c4d5e6f/drift-config"
)

config = response.json()
print(f"Drift threshold: {config['drift_threshold']}")
print(f"Warning threshold: {config['warning_threshold']}")
print(f"Auto-revoke: {config['auto_revoke']}")
print(f"Metric weights: {config['metric_weights']}")
```

**Response `200 OK`:**

```json
{
  "agent_id": "ag_1a2b3c4d5e6f",
  "drift_threshold": 0.7,
  "warning_threshold": 0.5,
  "auto_revoke": true,
  "spike_sensitivity": 2.0,
  "metric_weights": {
    "toxicity_score": 3.0,
    "hallucination_rate": 2.0,
    "error_rate": 1.0,
    "response_time": 0.5
  },
  "baseline_metrics": {
    "response_time": 0.3,
    "error_rate": 0.01,
    "toxicity_score": 0.02,
    "hallucination_rate": 0.005
  },
  "updated_at": "2026-02-01T12:30:00.000Z"
}
```

---

## 5. Webhooks

Webhooks deliver real-time event notifications to your server via HTTP POST. All payloads are signed with HMAC-SHA256 using your webhook secret (check the `X-Webhook-Signature` header to verify authenticity).

### Create a webhook

```bash
curl -X POST https://api.agentauth.dev/v1/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "ag_1a2b3c4d5e6f",
    "url": "https://api.yourapp.com/webhooks/agentauth",
    "events": [
      "agent.verified",
      "persona.created",
      "persona.updated",
      "agent.drift.warning",
      "agent.drift.revoked"
    ]
  }'
```

### List available events

```bash
curl https://api.agentauth.dev/v1/webhooks/events
```

### Other webhook endpoints

| Method   | Endpoint                                  | Description                     |
|----------|-------------------------------------------|---------------------------------|
| `GET`    | `/v1/webhooks?agent_id=ag_...`           | List webhooks for an agent      |
| `GET`    | `/v1/webhooks/:webhook_id`               | Get webhook details             |
| `PUT`    | `/v1/webhooks/:webhook_id`               | Update webhook URL/events       |
| `DELETE` | `/v1/webhooks/:webhook_id`               | Delete a webhook                |
| `POST`   | `/v1/webhooks/:webhook_id/toggle`        | Activate/deactivate a webhook   |
| `POST`   | `/v1/webhooks/:webhook_id/regenerate-secret` | Regenerate signing secret   |
| `GET`    | `/v1/webhooks/:webhook_id/deliveries`    | Get delivery history            |

---

## 6. Webhook Event Types

All events introduced or updated in v0.7.0 (Soul Layer):

| Event                    | Trigger                                         | Payload includes                                |
|--------------------------|--------------------------------------------------|-------------------------------------------------|
| `agent.registered`       | New agent registered                             | `agent_id`, `name`, `tier`                      |
| `agent.verified`         | Agent credentials verified                       | `agent_id`, `valid`, `status`                   |
| `agent.verification_failed` | Agent verification failed                     | `agent_id`, `reason`                            |
| `agent.tier_updated`     | Agent tier changed                               | `agent_id`, `old_tier`, `new_tier`              |
| `agent.status_updated`   | Agent status changed                             | `agent_id`, `old_status`, `new_status`          |
| `agent.permissions_updated` | Agent permissions changed                     | `agent_id`, `permissions`                       |
| `agent.deleted`          | Agent permanently deleted                        | `agent_id`                                      |
| `persona.created`        | New persona registered for an agent              | `agent_id`, `persona_version`, `persona_hash`   |
| `persona.updated`        | Existing persona updated                         | `agent_id`, `persona_version`, `persona_hash`, `previous_version` |
| `agent.drift.warning`    | Drift score exceeded warning threshold           | `agent_id`, `drift_score`, `spikes`, `threshold` |
| `agent.drift.revoked`    | Agent auto-revoked due to excessive drift        | `agent_id`, `drift_score`, `spikes`, `threshold` |

### Example webhook payload

```json
{
  "event": "agent.drift.warning",
  "timestamp": "2026-02-01T12:05:00.000Z",
  "data": {
    "agent_id": "ag_1a2b3c4d5e6f",
    "drift_score": 0.63,
    "spikes": ["toxicity_score"],
    "threshold": 0.5,
    "status": "warning"
  }
}
```

### Verifying webhook signatures

All webhook deliveries include an `X-Webhook-Signature` header. Verify it using HMAC-SHA256:

```python
import hmac
import hashlib

def verify_webhook(payload_bytes, signature_header, secret):
    expected = hmac.new(
        secret.encode(), payload_bytes, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature_header)
```

---

## 7. Error Codes Reference

All error responses follow a consistent JSON structure:

```json
{
  "error": "Error Type",
  "message": "Human-readable description",
  "details": []
}
```

| Status | Error                 | Description                                              | Common causes                                    |
|--------|-----------------------|----------------------------------------------------------|--------------------------------------------------|
| `400`  | Validation failed     | Request body failed schema validation                    | Missing required fields, invalid types, bad format |
| `401`  | Unauthorized          | Authentication credentials are invalid or missing        | Wrong API key, missing `X-Api-Key` header        |
| `403`  | Forbidden             | Valid credentials but insufficient permissions           | Agent is inactive, suspended, or revoked         |
| `404`  | Not Found             | The requested resource does not exist                    | Wrong agent ID, no persona registered            |
| `409`  | Conflict              | The request conflicts with current state                 | Persona already exists (use PUT to update)       |
| `413`  | Payload Too Large     | Request body exceeds size limit                          | Persona exceeds 10KB limit                       |
| `429`  | Rate Limit Exceeded   | Too many requests in the current time window             | Exceeded 100 req/15min or 10 req/15min for auth  |
| `500`  | Internal Server Error | An unexpected error occurred on the server               | Server bug, database connection failure          |

### Rate limit exceeded response example

```json
{
  "error": "Rate Limit Exceeded",
  "message": "Too many requests. Please try again later."
}
```

Response headers when rate limited:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1738329600
```

### Validation error response example

```json
{
  "error": "Validation failed",
  "message": "Invalid input data",
  "details": [
    { "field": "persona.version", "message": "Version is required" },
    { "field": "persona.guardrails.toxicity_threshold", "message": "Must be between 0 and 1" }
  ]
}
```

---

## Further Reading

- **OpenAPI Specification**: Available at `/api-docs` (Swagger UI) or raw YAML at [`docs/openapi.yaml`](./openapi.yaml)
- **Changelog**: See [`CHANGELOG.md`](../CHANGELOG.md) for version history
- **Status Page**: [agentauths.betteruptime.com](https://agentauths.betteruptime.com/)
- **Support**: [umytbaynazarow754@gmail.com](mailto:umytbaynazarow754@gmail.com)
