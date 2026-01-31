# Migrate from Clerk to AgentAuth

> Import users and permissions from Clerk's Backend API

## Prerequisites

- **AgentAuth CLI** installed (`npm install -g @umytbaynazarow/agentauth-cli`)
- **Clerk secret key** (`sk_live_xxx` or `sk_test_xxx` for testing)
- Users in Clerk with permissions stored in `public_metadata`

## How Clerk Permissions Work

Clerk doesn't have a built-in permissions system at the user level. The convention is to store permissions in `public_metadata`. The AgentAuth CLI reads from these fields:

| Metadata Field | Type | Example |
|---|---|---|
| `public_metadata.permissions` | `string[]` | `["read:tickets", "write:tickets"]` |
| `public_metadata.roles` | `string[]` | `["admin", "support"]` |
| `public_metadata.role` | `string` | `"admin"` |

### Setting Up Permissions in Clerk

If your Clerk users don't have permissions in metadata yet, set them via the Clerk Dashboard or API:

```bash
# Via Clerk Backend API
curl -X PATCH https://api.clerk.com/v1/users/user_abc123 \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "public_metadata": {
      "permissions": ["read:tickets", "write:tickets"]
    }
  }'
```

## Step 1: Preview with Dry Run

```bash
agentauth migrate clerk \
  --secret-key sk_test_xxx \
  --dry-run
```

Output:

```
━━━ Clerk Migration ━━━

✔ Found 3 agent(s) in Clerk

━━━ Dry Run Preview ━━━

Found 3 agent(s) to migrate:

  Jane Smith
    Source ID: user_2abc123
    Email:     jane@company.com
    Mapped:    zendesk:tickets:read, zendesk:tickets:write

  Bob Wilson
    Source ID: user_2def456
    Email:     bob@company.com
    Mapped:    hubspot:contacts:read
    Unmapped:  custom_permission

  Admin User
    Source ID: user_2ghi789
    Email:     admin@company.com
    Mapped:    *:*:*
```

## Step 2: Handle Custom Permissions

If you have Clerk-specific permission names, create a mapping file:

```json
{
  "rules": [],
  "defaults": {
    "custom_permission": "hubspot:deals:read",
    "support": "zendesk:tickets:read",
    "manager": "zendesk:users:write"
  },
  "unmappedAction": "warn"
}
```

```bash
agentauth migrate clerk \
  --secret-key sk_test_xxx \
  --mapping ./clerk-mapping.json \
  --dry-run
```

## Step 3: Run the Migration

```bash
agentauth migrate clerk \
  --secret-key sk_live_xxx \
  --output ./migration-output
```

## Which Users Are Migrated?

- Users **must have at least one email address**
- Users **must have permissions/roles in `public_metadata`**
- The **first email address** is used as the owner email
- User name is built from `first_name` + `last_name`, falling back to email

## Using Test vs Live Keys

| Key Type | When to Use |
|---|---|
| `sk_test_xxx` | Dry runs and testing against Clerk's test environment |
| `sk_live_xxx` | Production migration |

Test keys only access test-mode users. Always dry-run with your live key before the actual migration.

## Command Reference

```bash
agentauth migrate clerk [options]

Options:
  --secret-key <key>  Clerk secret key (required)
  --dry-run           Preview without registering
  --mapping <path>    Custom permission mapping JSON
  --output <path>     Output directory for credentials and report
  -h, --help          Show help
```

## Troubleshooting

### "Invalid secret key"

Make sure you're using the **secret key** (starts with `sk_`), not the publishable key (starts with `pk_`). Find it in Clerk Dashboard > API Keys.

### No users found

Users are skipped if they have no permissions in `public_metadata`. Check that your users have at least one of:
- `public_metadata.permissions` (array)
- `public_metadata.roles` (array)
- `public_metadata.role` (string)

### Rate limiting

Clerk has its own rate limits. If you hit them, the CLI will display the error with retry guidance. Wait and re-run the command.
