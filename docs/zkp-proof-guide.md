# ZKP Client-Side Proof Generation Guide

**AgentAuth v0.7.0**

This guide explains how to generate and verify zero-knowledge proofs client-side
using AgentAuth's anonymous verification system.

---

## Table of Contents

- [Overview](#overview)
- [Hash Mode (Quick Start)](#hash-mode-quick-start)
- [ZKP Mode (Full Anonymity)](#zkp-mode-full-anonymity)
- [Commitment Lifecycle](#commitment-lifecycle)
- [Security Considerations](#security-considerations)
- [API Reference Summary](#api-reference-summary)

---

## Overview

AgentAuth v0.7.0 introduces anonymous verification, allowing agents to prove
they hold valid credentials **without revealing their identity**. Two modes are
available:

| Mode | Algorithm | Privacy Level | Speed | Use Case |
|------|-----------|---------------|-------|----------|
| **Hash** | SHA-256 preimage check | Partial | Fast | Internal services, quick checks |
| **ZKP** | Groth16 zero-knowledge proof | Full anonymity | Slower | Cross-org verification, public APIs |

Both modes operate on a **commitment** -- a SHA-256 hash of the agent's
credentials and a random salt. The commitment is registered once, then used
repeatedly for anonymous verification.

**Base URLs:**

- Production: `https://api.agentauth.dev`
- Local: `http://localhost:3000`

---

## Hash Mode (Quick Start)

Hash mode is the simplest way to verify anonymously. The verifier checks that
you know the preimage (agent ID, API key, and salt) that hashes to the
commitment stored on the server.

### Step 1: Register a Commitment

Send your agent credentials to the server. The server generates a commitment
and a one-time salt.

```bash
curl -X POST https://api.agentauth.dev/v1/zkp/register-commitment \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "ag_1a2b3c4d5e6f",
    "api_key": "ag_sk_1a2b3c4d5e6f7g8h9i0j",
    "expires_in": 86400
  }'
```

**Response (201):**

```json
{
  "commitment": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "salt": "f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2",
  "expires_at": "2026-02-02T12:00:00.000Z",
  "message": "Store the salt securely \u2014 it will not be shown again."
}
```

Save `commitment` and `salt` immediately. The salt is only returned once.

### Step 2: Compute the Preimage Hash

The preimage is the string `agentId:apiKey:salt`, hashed with SHA-256. The
resulting hash **is** the commitment (the server computed the same thing during
registration).

### Step 3: Verify Anonymously

Send the commitment and preimage hash to the verification endpoint.

```bash
curl -X POST "https://api.agentauth.dev/v1/zkp/verify-anonymous?mode=hash" \
  -H "Content-Type: application/json" \
  -d '{
    "commitment": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    "preimage_hash": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
  }'
```

**Response (200):**

```json
{
  "valid": true,
  "reason": "Hash verification passed",
  "permissions": ["read", "write"],
  "tier": "pro"
}
```

### Node.js Example (Hash Mode)

```js
const crypto = require('crypto');

const AGENT_ID  = 'ag_1a2b3c4d5e6f';
const API_KEY   = 'ag_sk_1a2b3c4d5e6f7g8h9i0j';
const BASE_URL  = 'https://api.agentauth.dev';

// ── Step 1: Register commitment ──────────────────────────────────────────────

async function registerCommitment(expiresIn = 86400) {
  const res = await fetch(`${BASE_URL}/v1/zkp/register-commitment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_id: AGENT_ID,
      api_key: API_KEY,
      expires_in: expiresIn,
    }),
  });

  if (!res.ok) {
    throw new Error(`Registration failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  // IMPORTANT: Persist data.commitment and data.salt securely.
  // The salt will NOT be returned again.
  console.log('Commitment:', data.commitment);
  console.log('Salt:      ', data.salt);
  console.log('Expires at:', data.expires_at);
  return data;
}

// ── Step 2: Compute preimage hash ────────────────────────────────────────────

function computePreimageHash(agentId, apiKey, salt) {
  const preimage = `${agentId}:${apiKey}:${salt}`;
  return crypto.createHash('sha256').update(preimage).digest('hex');
}

// ── Step 3: Verify anonymously (hash mode) ───────────────────────────────────

async function verifyHash(commitment, preimageHash) {
  const res = await fetch(`${BASE_URL}/v1/zkp/verify-anonymous?mode=hash`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commitment,
      preimage_hash: preimageHash,
    }),
  });

  const result = await res.json();
  console.log('Verification result:', result);
  return result;
}

// ── Usage ────────────────────────────────────────────────────────────────────

(async () => {
  // Register (do this once)
  const { commitment, salt } = await registerCommitment();

  // Later, verify anonymously (can repeat as needed)
  const preimageHash = computePreimageHash(AGENT_ID, API_KEY, salt);
  const result = await verifyHash(commitment, preimageHash);

  if (result.valid) {
    console.log('Agent verified. Permissions:', result.permissions);
    console.log('Tier:', result.tier);
  } else {
    console.error('Verification failed:', result.reason);
  }
})();
```

---

## ZKP Mode (Full Anonymity)

ZKP mode uses a **Groth16 zero-knowledge proof** to verify the agent's identity
without revealing the preimage at all. The verifier learns nothing except that
the prover knows valid credentials corresponding to a registered commitment.

This mode requires:

- A **circom circuit** that encodes the identity proof logic
- The **snarkjs** library for proof generation (client) and verification (server)
- The circuit's **proving key** (`identity.zkey`) and **WASM binary**

### Circuit Concept

The identity circuit proves the following statement:

> "I know values `(agentId, apiKey, salt)` such that
> `SHA-256(agentId || ':' || apiKey || ':' || salt) == commitment`."

The commitment is a **public signal** (visible to the verifier). The agent ID,
API key, and salt are **private inputs** (never revealed).

### Step 1: Install Dependencies

```bash
npm install snarkjs
```

You also need the circuit artifacts, which are published alongside AgentAuth:

- `identity.wasm` -- the compiled circuit
- `identity.zkey` -- the proving key (generated during a trusted setup)

Place these files in a known directory, for example `./zkp/`.

### Step 2: Register a Commitment

Same as hash mode -- call `POST /v1/zkp/register-commitment` and save the
commitment and salt.

### Step 3: Generate the Proof

Prepare the circuit inputs and call `snarkjs.groth16.fullProve()`.

### Step 4: Send the Proof

Submit the proof and public signals to the verification endpoint.

```bash
curl -X POST "https://api.agentauth.dev/v1/zkp/verify-anonymous?mode=zkp" \
  -H "Content-Type: application/json" \
  -d '{
    "commitment": "a1b2c3d4e5f6...",
    "proof": {
      "pi_a": ["0x1234...", "0x5678...", "1"],
      "pi_b": [["0xabcd...", "0xef01..."], ["0x2345...", "0x6789..."]],
      "pi_c": ["0xaaaa...", "0xbbbb...", "1"]
    },
    "publicSignals": ["a1b2c3d4e5f6..."]
  }'
```

The first element of `publicSignals` must match the commitment.

**Response (200):**

```json
{
  "valid": true,
  "reason": "ZKP verification passed",
  "permissions": ["read", "write"],
  "tier": "pro"
}
```

### Node.js Example (ZKP Mode)

```js
const snarkjs = require('snarkjs');
const crypto  = require('crypto');
const path    = require('path');

const AGENT_ID  = 'ag_1a2b3c4d5e6f';
const API_KEY   = 'ag_sk_1a2b3c4d5e6f7g8h9i0j';
const BASE_URL  = 'https://api.agentauth.dev';

// Paths to circuit artifacts (adjust to your setup)
const WASM_FILE = path.join(__dirname, 'zkp', 'identity.wasm');
const ZKEY_FILE = path.join(__dirname, 'zkp', 'identity.zkey');

// ── Step 1: Register commitment (same as hash mode) ─────────────────────────

async function registerCommitment(expiresIn = 86400) {
  const res = await fetch(`${BASE_URL}/v1/zkp/register-commitment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_id: AGENT_ID,
      api_key: API_KEY,
      expires_in: expiresIn,
    }),
  });

  if (!res.ok) {
    throw new Error(`Registration failed: ${res.status}`);
  }

  return res.json();
}

// ── Step 2: Generate Groth16 proof ───────────────────────────────────────────

async function generateProof(agentId, apiKey, salt, commitment) {
  // Circuit inputs: private (agentId, apiKey, salt) + public (commitment)
  const input = {
    agentId:    BigInt('0x' + Buffer.from(agentId).toString('hex')),
    apiKey:     BigInt('0x' + Buffer.from(apiKey).toString('hex')),
    salt:       BigInt('0x' + salt),
    commitment: BigInt('0x' + commitment),
  };

  // fullProve generates the witness and the proof in one call
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    WASM_FILE,
    ZKEY_FILE
  );

  console.log('Proof generated successfully');
  console.log('Public signals:', publicSignals);

  return { proof, publicSignals };
}

// ── Step 3: Verify anonymously (ZKP mode) ───────────────────────────────────

async function verifyZKP(commitment, proof, publicSignals) {
  const res = await fetch(`${BASE_URL}/v1/zkp/verify-anonymous?mode=zkp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commitment,
      proof,
      publicSignals,
    }),
  });

  const result = await res.json();
  console.log('Verification result:', result);
  return result;
}

// ── Usage ────────────────────────────────────────────────────────────────────

(async () => {
  // 1. Register commitment (do this once, store salt securely)
  const { commitment, salt } = await registerCommitment();

  // 2. Generate the ZKP proof client-side
  const { proof, publicSignals } = await generateProof(
    AGENT_ID,
    API_KEY,
    salt,
    commitment
  );

  // 3. Verify anonymously -- no credentials are transmitted
  const result = await verifyZKP(commitment, proof, publicSignals);

  if (result.valid) {
    console.log('Agent verified with full anonymity.');
    console.log('Permissions:', result.permissions);
    console.log('Tier:', result.tier);
  } else {
    console.error('Verification failed:', result.reason);
  }
})();
```

### Browser Example (ZKP Mode)

For browser environments, use the ESM build of snarkjs and fetch the circuit
artifacts from a CDN or your own server.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AgentAuth ZKP Verification</title>
</head>
<body>
  <button id="verify-btn">Verify Agent (ZKP)</button>
  <pre id="output"></pre>

  <script type="module">
    import * as snarkjs from 'https://cdn.jsdelivr.net/npm/snarkjs@latest/build/snarkjs.min.js';

    const BASE_URL = 'https://api.agentauth.dev';
    const output   = document.getElementById('output');

    function log(msg) {
      output.textContent += msg + '\n';
    }

    // Convert a hex string to a BigInt for circuit input
    function hexToBigInt(hex) {
      return BigInt('0x' + hex);
    }

    // Convert an ASCII string to a hex-encoded BigInt
    function stringToBigInt(str) {
      const hex = Array.from(new TextEncoder().encode(str))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return BigInt('0x' + hex);
    }

    // Register a commitment (in production, do this server-side or in a
    // secure context -- the API key should not be exposed in the browser).
    async function registerCommitment(agentId, apiKey, expiresIn = 86400) {
      const res = await fetch(`${BASE_URL}/v1/zkp/register-commitment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          api_key: apiKey,
          expires_in: expiresIn,
        }),
      });

      if (!res.ok) throw new Error(`Registration failed: ${res.status}`);
      return res.json();
    }

    // Generate a Groth16 proof in the browser
    async function generateBrowserProof(agentId, apiKey, salt, commitment) {
      const input = {
        agentId:    stringToBigInt(agentId),
        apiKey:     stringToBigInt(apiKey),
        salt:       hexToBigInt(salt),
        commitment: hexToBigInt(commitment),
      };

      log('Generating proof (this may take a few seconds)...');

      // Fetch circuit artifacts from your server
      const wasmUrl = '/zkp/identity.wasm';
      const zkeyUrl = '/zkp/identity.zkey';

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        wasmUrl,
        zkeyUrl
      );

      log('Proof generated.');
      return { proof, publicSignals };
    }

    // Submit the proof for anonymous verification
    async function verifyAnonymous(commitment, proof, publicSignals) {
      const res = await fetch(`${BASE_URL}/v1/zkp/verify-anonymous?mode=zkp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitment, proof, publicSignals }),
      });

      return res.json();
    }

    // ── Main flow ────────────────────────────────────────────────────────────

    document.getElementById('verify-btn').addEventListener('click', async () => {
      try {
        // In a real application, these values come from secure storage.
        // NEVER hard-code credentials in client-side code.
        const agentId = 'ag_1a2b3c4d5e6f';
        const apiKey  = 'ag_sk_1a2b3c4d5e6f7g8h9i0j';

        // 1. Register commitment
        log('Registering commitment...');
        const { commitment, salt } = await registerCommitment(agentId, apiKey);
        log(`Commitment: ${commitment}`);

        // 2. Generate ZKP proof
        const { proof, publicSignals } = await generateBrowserProof(
          agentId, apiKey, salt, commitment
        );

        // 3. Verify anonymously
        log('Sending proof for verification...');
        const result = await verifyAnonymous(commitment, proof, publicSignals);
        log(`Result: ${JSON.stringify(result, null, 2)}`);
      } catch (err) {
        log(`Error: ${err.message}`);
      }
    });
  </script>
</body>
</html>
```

> **Important:** The browser example shows the full flow for demonstration
> purposes. In production, the commitment registration step (which requires the
> raw API key) should happen server-side or in a secure backend-for-frontend.
> Only the proof generation and verification submission should run in the
> browser.

---

## Commitment Lifecycle

A commitment progresses through the following states:

```
Registration
    |
    v
 [Active] ──────────────> [Expired]
    |                        (automatic, based on expires_at)
    |
    +───── verify ────────> [Verified]
    |                        (commitment remains active after verification)
    |
    +───── DELETE ────────> [Revoked]
                             (permanent, cannot be reactivated)
```

### States

| State | Description |
|-------|-------------|
| **Active** | Commitment is registered and available for verification. |
| **Verified** | A successful verification was performed. The commitment stays active and can be verified again. |
| **Revoked** | Commitment was explicitly revoked via `DELETE /v1/zkp/commitment/:commitment`. Cannot be used again. |
| **Expired** | The commitment's `expires_at` timestamp has passed. Treated the same as revoked during verification. Expired commitments are cleaned up automatically by a background job that runs every hour. |

### TTL (Time-to-Live)

Set a TTL during registration with the `expires_in` parameter (in seconds):

```json
{
  "agent_id": "ag_1a2b3c4d5e6f",
  "api_key": "ag_sk_1a2b3c4d5e6f7g8h9i0j",
  "expires_in": 3600
}
```

- `expires_in: 3600` -- commitment expires in 1 hour
- `expires_in: 86400` -- commitment expires in 24 hours
- Omit `expires_in` for a commitment that does not expire automatically

### Revocation

Revoke a commitment immediately:

```bash
curl -X DELETE https://api.agentauth.dev/v1/zkp/commitment/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

**Response (200):**

```json
{
  "success": true,
  "commitment": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "status": "revoked"
}
```

Attempting to verify a revoked or expired commitment returns:

```json
{
  "valid": false,
  "reason": "Commitment not found or revoked"
}
```

### Automatic Cleanup

Expired commitments are purged automatically by a background cleanup job that
runs every hour. During cleanup:

1. All active commitments with `expires_at` in the past are marked as `revoked`.
2. The corresponding `zkp_commitment` field on the agent record is cleared.

### Monitoring Active Commitments

Check how many commitments are currently active:

```bash
curl https://api.agentauth.dev/v1/zkp/active-count
```

```json
{
  "active_commitments": 42
}
```

---

## Security Considerations

### Salt Storage

- The salt is returned **exactly once** during commitment registration.
- If you lose the salt, you cannot reconstruct the preimage or generate a valid
  proof. You must register a new commitment.
- Store the salt in a secrets manager, encrypted database column, or secure
  enclave -- never in plaintext logs, environment variables exposed to
  client-side code, or version control.

### Hash Mode vs. ZKP Mode

| Property | Hash Mode | ZKP Mode |
|----------|-----------|----------|
| **What the verifier learns** | That the prover knows the preimage (agent ID + API key + salt) | Nothing, except that the prover holds valid credentials |
| **Anonymity** | Partial -- the preimage hash is transmitted, and the server compares it against the stored commitment | Full zero-knowledge -- the server verifies a cryptographic proof without learning the inputs |
| **Replay risk** | The preimage hash is deterministic; if intercepted, it can be replayed | The proof is bound to the specific circuit inputs; replay provides no advantage without the private inputs |
| **Performance** | Sub-millisecond | Proof generation takes 1-5 seconds depending on circuit complexity and hardware |

**Recommendation:** Use ZKP mode when verifying across organizational
boundaries or when the verification endpoint is publicly accessible. Use hash
mode for internal, trusted services where speed matters and the preimage hash
travels over a secure channel.

### Rate Limiting

All ZKP endpoints are rate-limited under the authentication rate limiter:

- **10 requests per 15 minutes** per IP for commitment registration and
  verification.
- Rate limit headers are included in every response:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

### Cache-Control

Verification responses include `Cache-Control: no-store` to prevent proxies,
CDNs, or browsers from caching verification results. This ensures that each
verification request is evaluated fresh against the current commitment state.

### Transport Security

- Always use HTTPS in production.
- Never transmit the raw API key or salt outside of the initial registration
  request.
- In ZKP mode, the proof and public signals are the only data sent during
  verification -- no credentials are transmitted.

### Commitment Binding

In ZKP mode, the server checks that `publicSignals[0]` matches the submitted
commitment. This prevents an attacker from generating a valid proof for one
commitment and submitting it against a different one.

---

## API Reference Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/zkp/register-commitment` | Register a new commitment. Requires `agent_id`, `api_key`, optional `expires_in`. Returns `commitment`, `salt`, `expires_at`. |
| `POST` | `/v1/zkp/verify-anonymous?mode=hash` | Verify via SHA-256 preimage hash. Body: `commitment`, `preimage_hash`. |
| `POST` | `/v1/zkp/verify-anonymous?mode=zkp` | Verify via Groth16 ZKP. Body: `commitment`, `proof`, `publicSignals`. |
| `DELETE` | `/v1/zkp/commitment/:commitment` | Revoke a commitment permanently. |
| `GET` | `/v1/zkp/active-count` | Count currently active commitments. |

For the full OpenAPI specification, see
[`openapi.yaml`](./openapi.yaml).
