# Migrate from Auth0 to AgentAuth

> Move your Auth0 users, roles, and permissions to AgentAuth in minutes

## Prerequisites

- **AgentAuth CLI** installed (`npm install -g @umytbaynazarow/agentauth-cli`)
- **Auth0 M2M application** with Management API access
- Auth0 M2M app needs these scopes: `read:users`, `read:roles`, `read:role_members`

## Step 1: Create an Auth0 M2M Application

If you don't already have one, create a Machine-to-Machine application in Auth0:

1. Go to **Auth0 Dashboard > Applications > Create Application**
2. Choose **Machine to Machine**
3. Authorize it for the **Auth0 Management API**
4. Grant these scopes:
   - `read:users`
   - `read:roles`
   - `read:role_members`
5. Copy the **Domain**, **Client ID**, and **Client Secret**

## Step 2: Preview with Dry Run

Always start with `--dry-run` to see what will be migrated without making changes:

```bash
agentauth migrate auth0 \
  --domain your-tenant.auth0.com \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET \
  --dry-run
```

Output:

```
━━━ Auth0 Migration ━━━

✔ Found 5 agent(s) in Auth0

━━━ Dry Run Preview ━━━

Found 5 agent(s) to migrate:

  Support Bot
    Source ID: auth0|abc123
    Email:     support@company.com
    Mapped:    zendesk:tickets:read, zendesk:tickets:write

  Sales Agent
    Source ID: auth0|def456
    Email:     sales@company.com
    Mapped:    hubspot:contacts:read, hubspot:deals:read
    Unmapped:  custom:crm:export

  ...
```

## Step 3: Handle Unmapped Permissions

Auth0 permissions that don't match AgentAuth's format are flagged as "unmapped." You have two options:

### Option A: Custom Mapping File

Create a `mapping.json` file:

```json
{
  "rules": [
    { "source": "custom:crm:export", "target": "salesforce:accounts:read" },
    { "source": "manage:.*", "target": "zendesk:users:write", "isRegex": true }
  ],
  "defaults": {
    "viewer": "zendesk:tickets:read",
    "editor": "zendesk:tickets:write"
  },
  "unmappedAction": "warn"
}
```

Then pass it with `--mapping`:

```bash
agentauth migrate auth0 \
  --domain your-tenant.auth0.com \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET \
  --mapping ./mapping.json \
  --dry-run
```

### Option B: Interactive Resolution

Run without `--dry-run` and the CLI will prompt you for each unmapped permission:

```
? How should "custom:crm:export" be mapped?
  Skip this permission
> Map to a specific AgentAuth permission
  Enter a custom mapping
```

## Step 4: Run the Migration

Once the dry run looks correct, remove `--dry-run`:

```bash
agentauth migrate auth0 \
  --domain your-tenant.auth0.com \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET \
  --mapping ./mapping.json \
  --output ./migration-output
```

The CLI will:

1. Fetch all users with roles from Auth0
2. Map permissions to AgentAuth format
3. Ask for confirmation before proceeding
4. Register each agent (rate-limited, ~10s between calls)
5. Save credentials and a migration report

## Step 5: Retrieve Credentials

After migration, two files are saved to the output directory:

**`migration-credentials.json`** (file permissions: 0600)
```json
{
  "source": "auth0",
  "migratedAt": "2025-01-15T10:30:00.000Z",
  "agents": [
    { "name": "Support Bot", "agentId": "agent_abc123", "apiKey": "ak_xyz789" },
    { "name": "Sales Agent", "agentId": "agent_def456", "apiKey": "ak_uvw321" }
  ]
}
```

**`migration-report-auth0.json`** - Full report with success/failure per agent.

## How Permissions Are Mapped

Auth0 permissions from roles are mapped to AgentAuth's `service:resource:action` format:

| Auth0 Permission | AgentAuth Permission |
|---|---|
| `read:tickets` | `zendesk:tickets:read` |
| `write:tickets` | `zendesk:tickets:write` |
| `read:users` | `zendesk:users:read` |
| `read:contacts` | `hubspot:contacts:read` |
| `read:repos` | `github:repos:read` |
| `admin` | `*:*:*` |

See the full default mapping list in the [permission mapper source](../../agentauth-cli/src/utils/permission-mapper.ts).

## Which Users Are Migrated?

- Users **must have an email** address
- Users **must have at least one role** assigned
- Users with no roles are skipped (logged as warning)
- Duplicate agent names are allowed

## Rate Limits

The AgentAuth API allows 10 registrations per 15 minutes. The CLI handles this automatically:

- 10-second delay between each registration
- Automatic retry on 429 responses (reads `retry-after` header)
- Estimated time displayed before migration starts

For 50 agents, expect ~8 minutes.

## Troubleshooting

### "Auth0 authentication failed"

Your M2M client ID or secret is wrong. Double-check in Auth0 Dashboard > Applications.

### "Auth0 M2M application lacks required scopes"

Go to Auth0 Dashboard > Applications > Your M2M App > APIs, and add:
- `read:users`
- `read:roles`
- `read:role_members`

### "Rate limited while trying to fetch users"

Auth0 has its own rate limits. The CLI will show the retry-after time. Wait and re-run.

### Partial failure mid-migration

If the migration fails partway through, credentials for already-registered agents are saved. Re-running the command will create new agents (not duplicates of the same Auth0 user), so check the partial report first.
