# Quickstart: Build a Drift-Proof Agent in 5 Steps

**AgentAuth v0.7.0** | Anti-Drift Vault

This guide walks you through registering an agent, defining its behavioral persona, configuring drift detection, sending health pings, and reacting to drift events -- all in five steps. By the end, your agent will automatically flag (or revoke itself) the moment its behavior deviates from the identity you defined.

**Prerequisites**

- AgentAuth server running at `http://localhost:3000` (see the main README for setup)
- cURL or any HTTP client
- Node.js 18+ (for the health-ping script in Step 4)

**Base URL used throughout:** `http://localhost:3000`

---

## Step 1: Register Your Agent

Every agent starts with a registration call. You provide a name, the owner's email, and a tier (`free`, `pro`, or `enterprise`). The server returns an `agent_id` and an `api_key` that you will use for every subsequent request.

```bash
curl -X POST http://localhost:3000/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "WeatherAssistant",
    "owner_email": "ops@acme-ai.com",
    "tier": "pro"
  }'
```

**Response (201 Created):**

```json
{
  "agent_id": "ag_7f3a9b2c1d4e",
  "name": "WeatherAssistant",
  "owner_email": "ops@acme-ai.com",
  "api_key": "ag_sk_x8k2m5p9q1w4r7t0y3u6",
  "tier": "pro",
  "permissions": [],
  "created_at": "2026-02-01T10:00:00.000Z"
}
```

Save both values now -- the API key is only shown once:

```bash
export AGENT_ID="ag_7f3a9b2c1d4e"
export API_KEY="ag_sk_x8k2m5p9q1w4r7t0y3u6"
```

---

## Step 2: Define Your Persona

A persona is your agent's "digital soul." It captures personality traits, guardrails, and hard constraints. Once submitted, AgentAuth signs the persona with HMAC-SHA256 using your API key, creating a tamper-proof record. Any later modification will produce a different hash, so integrity is verifiable at any time.

```bash
curl -X POST http://localhost:3000/v1/agents/${AGENT_ID}/persona \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: ${API_KEY}" \
  -d '{
    "persona": {
      "version": "1.0.0",
      "personality": {
        "traits": {
          "helpfulness": 0.95,
          "formality": 0.6,
          "conciseness": 0.8,
          "empathy": 0.7
        }
      },
      "guardrails": {
        "toxicity_threshold": 0.15,
        "hallucination_tolerance": "strict",
        "source_citation_required": true
      },
      "constraints": {
        "forbidden_topics": ["medical-diagnosis", "legal-advice", "financial-trading"],
        "required_disclaimers": ["AI-generated forecast", "Not a substitute for professional meteorology"],
        "max_response_length": 1500
      }
    }
  }'
```

**Response (201 Created):**

```json
{
  "agent_id": "ag_7f3a9b2c1d4e",
  "persona_version": "1.0.0",
  "persona_hash": "b9c1d4e8f2a6573091deabc4f87e23d156790ab3cdef1234567890abcdef1234",
  "created_at": "2026-02-01T10:01:00.000Z"
}
```

The `persona_hash` is the HMAC-SHA256 signature. You can verify integrity at any time by calling `POST /v1/agents/:id/persona/verify` with your API key.

---

## Step 3: Configure Drift Thresholds

Before sending any health pings, tell AgentAuth what "normal" looks like and how aggressively to react when behavior deviates.

| Field | Purpose |
|---|---|
| `drift_threshold` | Drift score at or above this value triggers a revocation (if `auto_revoke` is on). Range 0-1. |
| `warning_threshold` | Drift score at or above this value fires an `agent.drift.warning` webhook. Must be lower than `drift_threshold`. |
| `auto_revoke` | When `true`, the agent's status is set to `revoked` the instant the drift score exceeds `drift_threshold`. |
| `spike_sensitivity` | Number of standard deviations a single metric must jump (relative to recent history) to count as a "spike." |
| `metric_weights` | How much each metric contributes to the overall drift score. Higher weight = more influence. |
| `baseline_metrics` | The expected steady-state values for each metric. Drift is measured as deviation from these. |

```bash
curl -X PUT http://localhost:3000/v1/drift/${AGENT_ID}/drift-config \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: ${API_KEY}" \
  -d '{
    "drift_threshold": 0.7,
    "warning_threshold": 0.5,
    "auto_revoke": true,
    "spike_sensitivity": 2.0,
    "metric_weights": {
      "toxicity_score": 3.0,
      "hallucination_rate": 2.0,
      "error_rate": 1.0
    },
    "baseline_metrics": {
      "response_time": 0.3,
      "error_rate": 0.01,
      "toxicity_score": 0.02,
      "hallucination_rate": 0.005,
      "request_count": 200
    }
  }'
```

**Response (200 OK):**

```json
{
  "agent_id": "ag_7f3a9b2c1d4e",
  "drift_threshold": 0.7,
  "warning_threshold": 0.5,
  "auto_revoke": true,
  "spike_sensitivity": 2.0,
  "metric_weights": {
    "toxicity_score": 3.0,
    "hallucination_rate": 2.0,
    "error_rate": 1.0
  },
  "baseline_metrics": {
    "response_time": 0.3,
    "error_rate": 0.01,
    "toxicity_score": 0.02,
    "hallucination_rate": 0.005,
    "request_count": 200
  },
  "updated_at": "2026-02-01T10:02:00.000Z"
}
```

With this configuration:

- A drift score of **0.50** or higher fires a warning webhook.
- A drift score of **0.70** or higher auto-revokes the agent.
- A `toxicity_score` spike matters 3x more than an `error_rate` spike in the overall score.
- Any single metric that jumps more than 2 standard deviations from its recent mean is flagged as a spike.

---

## Step 4: Send Health Pings

Health pings are how your agent reports its behavioral metrics to the drift engine. Send a ping every hour (or more frequently in high-traffic scenarios). Each ping returns the current drift score, any detected spikes, and the agent's resulting status.

### Node.js example -- hourly health ping

```js
const AGENT_ID = process.env.AGENT_ID;   // ag_7f3a9b2c1d4e
const API_KEY  = process.env.API_KEY;     // ag_sk_x8k2m5p9q1w4r7t0y3u6
const BASE_URL = "http://localhost:3000";

async function collectMetrics() {
  // Replace this with real metric collection from your agent runtime.
  return {
    response_time:      0.32,
    error_rate:         0.012,
    toxicity_score:     0.03,
    hallucination_rate: 0.006,
    request_count:      185
  };
}

async function sendHealthPing() {
  const now      = new Date();
  const oneHrAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const metrics  = await collectMetrics();

  const res = await fetch(`${BASE_URL}/v1/drift/${AGENT_ID}/health-ping`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY
    },
    body: JSON.stringify({
      metrics,
      request_count: metrics.request_count,
      period_start: oneHrAgo.toISOString(),
      period_end:   now.toISOString()
    })
  });

  const data = await res.json();
  console.log(`[${now.toISOString()}] drift=${data.drift_score} status=${data.status} spikes=${JSON.stringify(data.spikes)}`);

  if (data.status === "revoked") {
    console.error("AGENT REVOKED -- stopping pings.");
    clearInterval(interval);
    process.exit(1);
  }
}

// Send a health ping every hour (3600000 ms).
const interval = setInterval(sendHealthPing, 3_600_000);

// Also send one immediately on startup.
sendHealthPing();
```

### Interpreting the response

**Healthy ping (drift score below warning threshold):**

```json
{
  "ping_id": 1,
  "agent_id": "ag_7f3a9b2c1d4e",
  "drift_score": 0.08,
  "spikes": [],
  "status": "healthy",
  "message": "Health ping recorded"
}
```

- `drift_score` -- a value between 0.0 (no drift) and 1.0 (maximum drift), computed as the weighted deviation of each metric from its baseline.
- `spikes` -- an array of metric names that jumped beyond the `spike_sensitivity` threshold (e.g., `["toxicity_score"]`). Empty when everything is normal.
- `status` -- one of `healthy`, `warning`, or `revoked`.

**Warning ping (drift score exceeds 0.5 but stays below 0.7):**

```json
{
  "ping_id": 14,
  "agent_id": "ag_7f3a9b2c1d4e",
  "drift_score": 0.58,
  "spikes": ["toxicity_score"],
  "status": "warning",
  "message": "Health ping recorded"
}
```

**Revocation ping (drift score hits 0.7 with auto_revoke enabled):**

```json
{
  "ping_id": 27,
  "agent_id": "ag_7f3a9b2c1d4e",
  "drift_score": 0.74,
  "spikes": ["toxicity_score", "hallucination_rate"],
  "status": "revoked",
  "message": "Health ping recorded"
}
```

After a revocation, the agent's status is set to `revoked` and further health pings will be rejected with `403 Forbidden` until the agent is manually re-activated.

---

## Step 5: React to Drift Events

Rather than polling drift scores, set up a webhook so AgentAuth pushes events to your server the moment something goes wrong.

### 5a. Register a webhook

Subscribe to `agent.drift.warning` and `agent.drift.revoked`:

```bash
curl -X POST http://localhost:3000/v1/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "ag_7f3a9b2c1d4e",
    "url": "https://api.acme-ai.com/webhooks/drift",
    "events": [
      "agent.drift.warning",
      "agent.drift.revoked"
    ]
  }'
```

**Response (201 Created):**

```json
{
  "id": "wh_9d8c7b6a5f4e",
  "agent_id": "ag_7f3a9b2c1d4e",
  "url": "https://api.acme-ai.com/webhooks/drift",
  "events": ["agent.drift.warning", "agent.drift.revoked"],
  "secret": "whsec_a1b2c3d4e5f6g7h8i9j0",
  "is_active": true,
  "created_at": "2026-02-01T10:03:00.000Z"
}
```

Save the `secret` for signature verification on your end.

### 5b. Webhook payload structure

When a drift event fires, AgentAuth POSTs a JSON payload to your URL:

```json
{
  "event": "agent.drift.warning",
  "timestamp": "2026-02-01T14:30:00.000Z",
  "data": {
    "agent_id": "ag_7f3a9b2c1d4e",
    "drift_score": 0.58,
    "spikes": ["toxicity_score"],
    "threshold_exceeded": "warning",
    "status": "warning"
  }
}
```

For a revocation event, the payload looks similar but with `"event": "agent.drift.revoked"` and `"threshold_exceeded": "drift"`.

### 5c. Express webhook handler

```js
const express = require("express");
const app = express();

app.use(express.json());

app.post("/webhooks/drift", (req, res) => {
  const { event, timestamp, data } = req.body;

  switch (event) {
    case "agent.drift.warning":
      console.warn(
        `[DRIFT WARNING] Agent ${data.agent_id} at ${timestamp}\n` +
        `  Score: ${data.drift_score}\n` +
        `  Spikes: ${data.spikes.join(", ")}`
      );
      // Example: page on-call, throttle the agent, or trigger a review.
      break;

    case "agent.drift.revoked":
      console.error(
        `[DRIFT REVOKED] Agent ${data.agent_id} at ${timestamp}\n` +
        `  Score: ${data.drift_score}\n` +
        `  Spikes: ${data.spikes.join(", ")}`
      );
      // Example: kill the agent process, notify the team, open an incident.
      shutdownAgent(data.agent_id);
      break;

    default:
      console.log(`Unhandled event: ${event}`);
  }

  // Always respond 200 so AgentAuth marks the delivery as successful.
  res.sendStatus(200);
});

function shutdownAgent(agentId) {
  // Your shutdown logic here: stop the process, disable the queue consumer, etc.
  console.log(`Shutting down agent ${agentId}...`);
}

app.listen(4000, () => {
  console.log("Webhook listener running on port 4000");
});
```

---

## Bonus: Monitor via Dashboard

AgentAuth ships with a built-in dashboard. Navigate to the **/drift** page in your browser to see real-time drift gauges, spike history, and per-metric breakdowns for every registered agent.

If you prefer API polling over webhooks, fetch the current drift score at any time:

```bash
curl http://localhost:3000/v1/drift/${AGENT_ID}/drift-score
```

**Response:**

```json
{
  "agent_id": "ag_7f3a9b2c1d4e",
  "drift_score": 0.08,
  "trend": "stable",
  "last_ping_at": "2026-02-01T14:00:00.000Z",
  "status": "healthy"
}
```

The `trend` field is one of `improving`, `stable`, or `worsening`, calculated from the last several pings. Use it to surface early-warning signals in your own monitoring stack before the score crosses a threshold.

---

## Recap

| Step | Endpoint | What it does |
|---|---|---|
| 1. Register | `POST /v1/agents/register` | Creates the agent, returns `agent_id` + `api_key` |
| 2. Persona | `POST /v1/agents/:id/persona` | Defines the agent's behavioral identity (HMAC-signed) |
| 3. Configure | `PUT /v1/drift/:id/drift-config` | Sets thresholds, weights, baselines, auto-revoke |
| 4. Health ping | `POST /v1/drift/:id/health-ping` | Reports metrics, returns drift score + spikes |
| 5. Webhooks | `POST /v1/webhooks` | Pushes `agent.drift.warning` and `agent.drift.revoked` to your server |
| Bonus | `GET /v1/drift/:id/drift-score` | Polls current drift score and trend |

Your agent is now drift-proof. If its behavior shifts -- higher toxicity, rising hallucination rates, or error spikes -- AgentAuth will catch it, warn you, and shut the agent down before it causes damage.
