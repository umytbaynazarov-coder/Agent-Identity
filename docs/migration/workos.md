# Migrate from WorkOS to AgentAuth

> Import users, organization roles, and permissions from WorkOS

## Prerequisites

- **AgentAuth CLI** installed (`npm install -g @umytbaynazarow/agentauth-cli`)
- **WorkOS API key** (`sk_xxx`)
- WorkOS User Management enabled

## How WorkOS Permissions Are Collected

The CLI collects permissions from two sources per user:

1. **User metadata** - `metadata.permissions`, `metadata.roles`, or `metadata.role`
2. **Organization memberships** - Each user's org membership role is resolved to its permissions via the WorkOS Roles API

```
User -> Org Memberships -> Role slug -> Role permissions
                        -> Role slug (if no permissions defined)
```

If an organization role has explicit permissions defined, those are used. If not, the role slug itself (e.g., `admin`, `member`) is treated as a permission identifier and mapped through the default or custom mapping.

## Step 1: Preview with Dry Run

```bash
agentauth migrate workos \
  --api-key sk_xxx \
  --dry-run
```

Output:

```
━━━ WorkOS Migration ━━━

✔ Found 4 agent(s) in WorkOS

━━━ Dry Run Preview ━━━

Found 4 agent(s) to migrate:

  Alice Johnson
    Source ID: user_01abc
    Email:     alice@company.com
    Mapped:    zendesk:tickets:read, zendesk:users:read

  Bob Smith
    Source ID: user_01def
    Email:     bob@company.com
    Mapped:    *:*:*

  Carol Williams
    Source ID: user_01ghi
    Email:     carol@company.com
    Unmapped:  member
```

## Step 2: Map Organization Roles

WorkOS organization roles (e.g., `admin`, `member`, `billing`) need to be mapped to AgentAuth permissions. Create a mapping file:

```json
{
  "rules": [],
  "defaults": {
    "admin": "*:*:*",
    "member": "zendesk:tickets:read",
    "billing": "stripe:payments:read",
    "support": "zendesk:tickets:write",
    "developer": "github:repos:read"
  },
  "unmappedAction": "prompt"
}
```

```bash
agentauth migrate workos \
  --api-key sk_xxx \
  --mapping ./workos-mapping.json \
  --dry-run
```

## Step 3: Run the Migration

```bash
agentauth migrate workos \
  --api-key sk_xxx \
  --mapping ./workos-mapping.json \
  --output ./migration-output
```

## Which Users Are Migrated?

- Users **must have an email** address
- Users **must have at least one of:**
  - Permissions in `metadata`
  - An organization membership with a role
- Users with no permissions from either source are skipped

## Multi-Organization Users

If a user belongs to multiple organizations with different roles, all permissions from all organizations are merged and deduplicated. For example:

| Organization | Role | Permissions |
|---|---|---|
| Acme Corp | `admin` | `*:*:*` |
| Partner Inc | `member` | `zendesk:tickets:read` |

Result: `*:*:*` (admin supersedes all)

## Command Reference

```bash
agentauth migrate workos [options]

Options:
  --api-key <key>   WorkOS API key (required)
  --dry-run         Preview without registering
  --mapping <path>  Custom permission mapping JSON
  --output <path>   Output directory for credentials and report
  -h, --help        Show help
```

## API Endpoints Used

The CLI accesses these WorkOS endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /user_management/users` | List all users (cursor-paginated) |
| `GET /user_management/organization_memberships` | Get user's org roles |
| `GET /organizations/{id}/roles` | Get org role definitions + permissions |

Your API key needs access to User Management and Organizations.

## Troubleshooting

### "Invalid API key"

Verify your WorkOS API key at WorkOS Dashboard > API Keys. The key should start with `sk_`.

### No users found

Check that your users have either:
- Permissions in their `metadata` object
- At least one organization membership with a role assigned

### Organization roles endpoint returns 404

The roles endpoint may not be available on all WorkOS plans. If roles can't be fetched, the CLI falls back to using the role slug itself as a permission identifier, which can be mapped via `--mapping`.

### Cursor pagination timeout

For very large user bases (10,000+), the migration may take a while to fetch all users. The CLI handles pagination automatically but shows progress in the spinner.
