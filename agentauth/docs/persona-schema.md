# Persona JSON Schema Reference

**AgentAuth v0.7.0**

The persona object defines an AI agent's behavioral identity -- its personality traits, safety guardrails, and operational constraints. It is attached to an agent on registration or updated via the persona endpoints.

---

## Schema Overview

| Field | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `version` | `string` | Yes | Semantic version of the persona definition. | Must be valid semver (e.g. `"1.0.0"`). Required on registration. Auto-bumps minor on update unless a higher explicit version is provided. |
| `personality` | `object` | No | Defines the agent's behavioral characteristics. | See [Personality Block](#personality-block). |
| `personality.traits` | `object` | No | Key-value pairs describing individual personality traits. | Values are either a number `0`--`1` or a string from the [allowed traits list](#allowed-traits). |
| `personality.assistantAxis` | `array` of `object` | No | Neural steering vectors for fine-grained directional tuning. | Each entry is a freeform object representing a single axis. |
| `personality.neuralVectors` | `object` | No | Broader LLM compatibility vectors. | Freeform key-value pairs for cross-model portability. |
| `guardrails` | `object` | No | Safety and quality thresholds. | See [Guardrails Block](#guardrails-block). |
| `guardrails.toxicity_threshold` | `number` | No | Maximum tolerated toxicity score before a response is blocked. | `0`--`1`. Lower is stricter. |
| `guardrails.hallucination_tolerance` | `string` | No | How strictly the agent must ground responses in source material. | One of `"strict"`, `"moderate"`, `"lenient"`. |
| `guardrails.source_citation_required` | `boolean` | No | Whether the agent must cite sources in its responses. | `true` or `false`. |
| `constraints` | `object` | No | Hard operational limits on agent behavior. | See [Constraints Block](#constraints-block). |
| `constraints.forbidden_topics` | `array` of `string` | No | Topics the agent must refuse to discuss. | Each entry is a plain-text topic descriptor. |
| `constraints.required_disclaimers` | `array` of `string` | No | Disclaimers the agent must include in relevant responses. | Each entry is the full disclaimer text. |
| `constraints.allowed_actions` | `array` of `string` | No | Exhaustive list of actions the agent is permitted to perform. | When present, any action not listed is implicitly denied. |
| `constraints.blocked_actions` | `array` of `string` | No | Actions the agent is explicitly forbidden from performing. | Evaluated after `allowed_actions`. |
| `constraints.max_response_length` | `integer` | No | Maximum number of tokens (or characters, depending on implementation) per response. | Must be a positive integer. |

> **Extensible schema.** Additional properties beyond those listed above are permitted at any level. Unknown fields are preserved on storage and returned on read.

---

## Personality Block

### Traits

The `personality.traits` object holds key-value pairs. Each value is one of:

- **Numeric** -- a floating-point number from `0` to `1`, representing intensity (e.g. `"helpfulness": 0.9`).
- **String** -- a value drawn from the allowed traits list below.

#### Allowed Traits

| Trait | Category |
|---|---|
| `risk-averse` | Decision-making |
| `cautious` | Decision-making |
| `strategic` | Decision-making |
| `conservative` | Decision-making |
| `helpful` | Interaction style |
| `empathetic` | Interaction style |
| `cooperative` | Interaction style |
| `assertive` | Interaction style |
| `neutral` | Interaction style |
| `creative` | Thinking style |
| `analytical` | Thinking style |
| `innovative` | Thinking style |
| `detail-oriented` | Thinking style |
| `formal` | Communication |
| `concise` | Communication |
| `verbose` | Communication |
| `proactive` | Behavior |
| `reactive` | Behavior |
| `adaptive` | Behavior |
| `compliant` | Behavior |

### assistantAxis

An array of objects representing neural steering vectors. These are freeform and implementation-specific -- each object encodes a directional bias along a particular behavioral axis.

### neuralVectors

A freeform object for broader LLM compatibility. Use this block when the persona must be portable across different model providers or runtimes.

---

## Guardrails Block

| Field | Type | Range | Description |
|---|---|---|---|
| `toxicity_threshold` | `number` | `0`--`1` | Scores above this value cause the response to be blocked. A value of `0.0` blocks nearly everything; `1.0` permits everything. |
| `hallucination_tolerance` | `string` | `"strict"` / `"moderate"` / `"lenient"` | `strict` requires all claims to be grounded. `moderate` allows reasonable inference. `lenient` permits speculative answers. |
| `source_citation_required` | `boolean` | `true` / `false` | When `true`, the agent must include source citations in its output. |

---

## Constraints Block

| Field | Type | Description |
|---|---|---|
| `forbidden_topics` | `array` of `string` | The agent must refuse to engage with any topic in this list. |
| `required_disclaimers` | `array` of `string` | Text that must be included verbatim in responses when contextually relevant. |
| `allowed_actions` | `array` of `string` | Whitelist of permitted actions. If present, unlisted actions are denied by default. |
| `blocked_actions` | `array` of `string` | Blacklist of denied actions. Takes precedence over `allowed_actions` if both are set. |
| `max_response_length` | `integer` (positive) | Upper bound on response length. |

---

## Complete Example

```json
{
  "version": "1.0.0",
  "personality": {
    "traits": {
      "helpfulness": 0.95,
      "formality": 0.7,
      "creativity": 0.6,
      "disposition": "empathetic",
      "decision_style": "risk-averse",
      "verbosity": 0.4
    },
    "assistantAxis": [
      { "axis": "warmth-detachment", "value": 0.8 },
      { "axis": "brevity-elaboration", "value": 0.35 }
    ],
    "neuralVectors": {
      "openai_compat": { "temperature_bias": 0.3 },
      "anthropic_compat": { "style_hint": "professional" }
    }
  },
  "guardrails": {
    "toxicity_threshold": 0.15,
    "hallucination_tolerance": "strict",
    "source_citation_required": true
  },
  "constraints": {
    "forbidden_topics": [
      "competitor-internal-roadmaps",
      "medical-diagnosis",
      "legal-advice"
    ],
    "required_disclaimers": [
      "This is AI-generated content and should not be taken as professional advice."
    ],
    "allowed_actions": [
      "summarize",
      "translate",
      "answer-question",
      "draft-email"
    ],
    "blocked_actions": [
      "execute-code",
      "send-email-without-approval"
    ],
    "max_response_length": 4096
  }
}
```

## Minimal Example

Only the `version` field is required:

```json
{
  "version": "1.0.0"
}
```

All other blocks are optional and default to empty/unset on the server side.

---

## Signing Process

Every persona is signed with **HMAC-SHA256** using the agent's API key. The signature is verified on every read and rejected on tamper.

### Steps

1. **Canonicalize** the persona object:
   - Sort all keys alphabetically at every nesting level.
   - Round all floating-point values to a precision of `1e10` (ten decimal places).

2. **Serialize** the canonicalized object with `JSON.stringify` (no extra whitespace).

3. **Sign** the resulting string with HMAC-SHA256, using the agent's API key as the secret.

### Pseudocode

```js
const canonical = canonicalize(persona);   // sort keys, round floats to 1e10
const payload   = JSON.stringify(canonical);
const signature = hmacSHA256(payload, agentApiKey);
```

The server performs the same canonicalization on read and compares signatures. A mismatch returns `403 Forbidden`.

---

## Version Bumping Rules

| Scenario | Result |
|---|---|
| Persona updated with **no explicit version** in the request body. | The server auto-increments the **minor** component (e.g. `1.0.0` becomes `1.1.0`). |
| Persona updated with an explicit version that is **higher** than the current version. | The provided version is accepted as-is. |
| Persona updated with an explicit version that is **equal to or lower** than the current version. | The request is rejected (`409 Conflict`). |

All previous versions are retained in the `persona_history` table for auditability.

---

## Size Limits

| Limit | Value | HTTP Status on Violation |
|---|---|---|
| Maximum serialized persona size | **10 KB** | `413 Payload Too Large` |

The size is measured after JSON serialization (the raw byte length of `JSON.stringify(persona)`). Keep payloads well under this limit -- deeply nested `neuralVectors` or large `forbidden_topics` lists are the most common causes of breaches.
