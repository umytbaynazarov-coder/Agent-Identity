# Migrate from JWT / Custom Auth to AgentAuth

> Import agents from any auth system using a simple JSON config file

The JWT migrator is a generic importer for any authentication system. You define your agents and permission mappings in a JSON file, and the CLI handles the rest.

## Prerequisites

- **AgentAuth CLI** installed (`npm install -g @umytbaynazarow/agentauth-cli`)
- A JSON config file describing your agents

## Step 1: Create a Config File

Create a file (e.g., `agents.json`) with your agents and an optional permission mapping:

```json
{
  "agents": [
    {
      "name": "Support Bot",
      "email": "support@company.com",
      "permissions": ["read:tickets", "write:tickets"]
    },
    {
      "name": "Analytics Agent",
      "email": "analytics@company.com",
      "permissions": ["read:contacts", "read:deals", "export_data"]
    },
    {
      "name": "Admin Bot",
      "email": "admin@company.com",
      "permissions": ["admin"]
    }
  ],
  "permission_mapping": {
    "export_data": "hubspot:companies:read"
  }
}
```

### Config Format

| Field | Required | Description |
|---|---|---|
| `agents` | Yes | Array of agent objects |
| `agents[].name` | Yes | Display name for the agent |
| `agents[].email` | Yes | Owner email address |
| `agents[].permissions` | Yes | Array of permission strings |
| `permission_mapping` | No | Map custom permission names to AgentAuth format |

### Permission Resolution Order

For each permission string, the CLI checks in this order:

1. **Already valid** - If it's already in `service:resource:action` format, use as-is
2. **Inline mapping** - Check `permission_mapping` in the config file
3. **Default mapping** - Check built-in mappings (e.g., `read:tickets` -> `zendesk:tickets:read`)
4. **Unmapped** - Flagged for interactive resolution or skipped

## Step 2: Preview with Dry Run

```bash
agentauth migrate jwt --config ./agents.json --dry-run
```

Output:

```
━━━ JWT / JSON Migration ━━━

✔ Loaded 3 agent(s) from config

━━━ Dry Run Preview ━━━

Found 3 agent(s) to migrate:

  Support Bot
    Source ID: jwt-0-support@company.com
    Email:     support@company.com
    Mapped:    zendesk:tickets:read, zendesk:tickets:write

  Analytics Agent
    Source ID: jwt-1-analytics@company.com
    Email:     analytics@company.com
    Mapped:    hubspot:contacts:read, hubspot:deals:read, hubspot:companies:read

  Admin Bot
    Source ID: jwt-2-admin@company.com
    Email:     admin@company.com
    Mapped:    *:*:*
```

## Step 3: Run the Migration

```bash
agentauth migrate jwt \
  --config ./agents.json \
  --output ./migration-output
```

## Use Cases

### Migrating from a Custom JWT System

If your app issues its own JWTs with permission claims, export your user table to JSON:

```json
{
  "agents": [
    { "name": "Bot 1", "email": "bot1@app.com", "permissions": ["tickets.read", "tickets.write"] }
  ],
  "permission_mapping": {
    "tickets.read": "zendesk:tickets:read",
    "tickets.write": "zendesk:tickets:write",
    "users.manage": "zendesk:users:write"
  }
}
```

### Migrating from Firebase Auth

Export your Firebase users with custom claims:

```json
{
  "agents": [
    {
      "name": "Firebase Agent",
      "email": "agent@app.com",
      "permissions": ["admin"]
    }
  ],
  "permission_mapping": {}
}
```

### Bulk Provisioning New Agents

You can also use this command to provision agents in bulk, even without migrating from another system:

```json
{
  "agents": [
    { "name": "Zendesk Reader", "email": "reader@ops.com", "permissions": ["zendesk:tickets:read"] },
    { "name": "Slack Writer", "email": "writer@ops.com", "permissions": ["slack:messages:write"] },
    { "name": "Full Access", "email": "admin@ops.com", "permissions": ["*:*:*"] }
  ],
  "permission_mapping": {}
}
```

Since these permissions are already in AgentAuth format, no mapping is needed.

## Validation

The CLI validates your config file before processing:

- Every agent must have `name`, `email`, and `permissions`
- `permissions` must be an array
- Invalid entries produce a clear error with the agent index

```
Error: Agent at index 2 ("Bad Agent") is missing a "permissions" array
```

## Output Files

Same as all other migration commands:

- **`migration-credentials.json`** - Agent IDs and API keys (0600 permissions)
- **`migration-report-jwt.json`** - Full results per agent

## Available Permissions

AgentAuth supports these services and permissions:

| Service | Permissions |
|---|---|
| `zendesk` | `tickets:read`, `tickets:write`, `users:read`, `users:write` |
| `slack` | `messages:read`, `messages:write`, `channels:read`, `channels:write` |
| `hubspot` | `contacts:read`, `contacts:write`, `deals:read`, `deals:write`, `companies:read` |
| `github` | `repos:read`, `repos:write`, `issues:read`, `issues:write`, `pull_requests:read` |
| `salesforce` | `accounts:read`, `accounts:write`, `leads:read`, `leads:write` |
| `stripe` | `payments:read`, `customers:read`, `invoices:read` |
| `admin` | `*:*:*` (full access) |

Wildcards are also supported: `zendesk:*:*` (all Zendesk access), `zendesk:tickets:*` (all ticket actions).
