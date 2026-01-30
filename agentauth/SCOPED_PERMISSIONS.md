# Scoped Permissions System

## Overview

AgentAuths now features a **scoped permission system** that provides granular, resource-level access control similar to Auth0 and AWS IAM. Instead of basic permissions like `read` or `write`, you can now specify exactly what services, resources, and actions an agent can access.

## Permission Format

Permissions follow the format: `service:resource:action`

### Examples
```
zendesk:tickets:read       # Read Zendesk tickets
slack:messages:write       # Write Slack messages
hubspot:contacts:read      # Read HubSpot contacts
github:repos:write         # Write GitHub repositories
*:*:*                      # Admin - full access to everything
```

## Supported Services

### Zendesk
- `zendesk:tickets:read` - Read support tickets
- `zendesk:tickets:write` - Create/update support tickets
- `zendesk:users:read` - Read user information
- `zendesk:users:write` - Create/update users

### Slack
- `slack:messages:read` - Read messages
- `slack:messages:write` - Post messages
- `slack:channels:read` - Read channel information
- `slack:channels:write` - Create/manage channels

### HubSpot
- `hubspot:contacts:read` - Read contacts
- `hubspot:contacts:write` - Create/update contacts
- `hubspot:deals:read` - Read deals
- `hubspot:deals:write` - Create/update deals
- `hubspot:companies:read` - Read companies

### GitHub
- `github:repos:read` - Read repositories
- `github:repos:write` - Create/update repositories
- `github:issues:read` - Read issues
- `github:issues:write` - Create/update issues
- `github:pull_requests:read` - Read pull requests

### Salesforce
- `salesforce:accounts:read` - Read accounts
- `salesforce:accounts:write` - Create/update accounts
- `salesforce:leads:read` - Read leads
- `salesforce:leads:write` - Create/update leads

### Stripe
- `stripe:payments:read` - Read payment information
- `stripe:customers:read` - Read customer information
- `stripe:invoices:read` - Read invoices

## Wildcard Permissions

The system supports wildcards at multiple levels:

### Admin Wildcard
```
*:*:*
```
Grants full access to all services, resources, and actions.

### Service-Level Wildcard
```
zendesk:*:*
```
Grants access to all Zendesk resources and actions.

### Resource-Level Wildcard
```
zendesk:tickets:*
```
Grants all actions on Zendesk tickets (read, write, etc.).

## Usage Examples

### 1. Register an Agent with Scoped Permissions

```bash
curl -X POST https://your-api.com/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support Agent",
    "owner_email": "you@company.com",
    "permissions": [
      "zendesk:tickets:read",
      "zendesk:tickets:write",
      "slack:messages:write",
      "hubspot:contacts:read"
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Agent registered successfully. Save your API key - it won't be shown again!",
  "agent": {
    "agent_id": "agt_abc123",
    "name": "Customer Support Agent",
    "status": "active",
    "created_at": "2026-01-29T10:00:00Z"
  },
  "credentials": {
    "api_key": "ak_xyz789...",
    "token_type": "Bearer"
  }
}
```

### 2. List Available Permissions

```bash
curl https://your-api.com/permissions/list
```

**Response:**
```json
{
  "permissions": {
    "zendesk": [
      "zendesk:tickets:read",
      "zendesk:tickets:write",
      "zendesk:users:read",
      "zendesk:users:write"
    ],
    "slack": [...],
    "hubspot": [...],
    "github": [...],
    "admin": ["*:*:*"]
  },
  "format": "service:resource:action",
  "examples": [
    "zendesk:tickets:read",
    "slack:messages:write",
    "*:*:* (admin - full access)"
  ],
  "wildcards": {
    "admin": "*:*:* grants full access to everything",
    "service": "zendesk:*:* grants access to all Zendesk resources",
    "resource": "zendesk:tickets:* grants all actions on Zendesk tickets"
  }
}
```

### 3. Using the Permission Middleware in Your Routes

```javascript
const express = require('express');
const app = express();

// Example: Protected route requiring specific permission
app.post('/zendesk/tickets', 
  authenticateToken,
  requirePermission('zendesk:tickets:write'),
  async (req, res) => {
    // Only agents with zendesk:tickets:write permission can access this
    const ticket = await createZendeskTicket(req.body);
    res.json({ success: true, ticket });
  }
);

// Example: Route with wildcard permission check
app.get('/admin/stats',
  authenticateToken,
  requirePermission('*:*:*'),
  async (req, res) => {
    // Only admin agents can access this
    const stats = await getSystemStats();
    res.json(stats);
  }
);
```

### 4. Manual Permission Checking

```javascript
// In your route logic
app.post('/complex-action', authenticateToken, async (req, res) => {
  const { permissions } = req.agent;
  
  // Check if agent has permission
  if (hasPermission(permissions, 'zendesk:tickets:write')) {
    // Agent has permission
    await performAction();
  } else {
    return res.status(403).json({ 
      error: 'Insufficient permissions',
      required: 'zendesk:tickets:write',
      granted: permissions
    });
  }
});
```

## Permission Validation

When registering an agent, the system validates:

1. **Format**: Each permission must follow `service:resource:action`
2. **Service exists**: The service must be in the supported list
3. **Permission exists**: The resource:action combination must be valid for that service
4. **No duplicates**: Duplicate permissions are automatically removed

### Validation Error Example

```bash
curl -X POST https://your-api.com/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "owner_email": "test@example.com",
    "permissions": [
      "invalid-format",
      "unknown:service:read",
      "zendesk:invalid:read"
    ]
  }'
```

**Response:**
```json
{
  "error": "Invalid permissions",
  "invalid_permissions": [
    {
      "permission": "invalid-format",
      "reason": "Invalid format. Must be \"service:resource:action\""
    },
    {
      "permission": "unknown:service:read",
      "reason": "Unknown service \"unknown\". Valid services: zendesk, slack, hubspot, github, salesforce, stripe"
    },
    {
      "permission": "zendesk:invalid:read",
      "reason": "Invalid permission for zendesk. Valid: tickets:read, tickets:write, users:read, users:write"
    }
  ],
  "valid_format": "service:resource:action",
  "examples": [
    "zendesk:tickets:read",
    "slack:messages:write"
  ]
}
```

## Common Use Cases

### 1. Read-Only Agent
```json
{
  "permissions": [
    "zendesk:tickets:read",
    "zendesk:users:read",
    "hubspot:contacts:read",
    "hubspot:deals:read"
  ]
}
```

### 2. Customer Support Agent
```json
{
  "permissions": [
    "zendesk:tickets:read",
    "zendesk:tickets:write",
    "slack:messages:write",
    "hubspot:contacts:read"
  ]
}
```

### 3. Sales Agent
```json
{
  "permissions": [
    "hubspot:contacts:read",
    "hubspot:contacts:write",
    "hubspot:deals:read",
    "hubspot:deals:write",
    "salesforce:leads:write"
  ]
}
```

### 4. DevOps Agent
```json
{
  "permissions": [
    "github:repos:read",
    "github:repos:write",
    "github:issues:write",
    "slack:messages:write"
  ]
}
```

### 5. Admin Agent
```json
{
  "permissions": ["*:*:*"]
}
```

## Security Best Practices

1. **Principle of Least Privilege**: Grant only the permissions an agent actually needs
2. **Use Specific Permissions**: Avoid wildcards unless necessary
3. **Regular Audits**: Review agent permissions periodically
4. **Revoke Unused Agents**: Use the `/agents/:id/revoke` endpoint for inactive agents
5. **Monitor Activity**: Check `/agents/:id/activity` for suspicious behavior

## Testing Permission-Protected Routes

The API includes example integration endpoints for testing:

```bash
# Get your JWT token first
TOKEN="your_jwt_token_here"

# Test Zendesk ticket creation
curl -X POST https://your-api.com/integrations/zendesk/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Test Slack message posting
curl -X POST https://your-api.com/integrations/slack/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Test HubSpot contact reading
curl https://your-api.com/integrations/hubspot/contacts \
  -H "Authorization: Bearer $TOKEN"
```

## Migration from Old Permission System

If you have existing agents with old-style permissions (`read`, `write`, `admin`), you'll need to:

1. **Register new agents** with scoped permissions
2. **Update your code** to use the new permission format
3. **Revoke old agents** after migration is complete

The old permission format is no longer supported in v0.2.0+.

## API Reference

### GET /permissions/list
List all available permissions across all services.

**Authentication**: None required

**Response**: 200 OK
```json
{
  "permissions": { ... },
  "format": "service:resource:action",
  "examples": [...],
  "wildcards": { ... }
}
```

### POST /agents/register
Register a new agent with scoped permissions.

**Body**:
```json
{
  "name": "Agent Name",
  "owner_email": "owner@example.com",
  "permissions": [
    "service:resource:action"
  ]
}
```

**Response**: 201 Created (on success) or 400 Bad Request (validation error)

## Troubleshooting

### Error: "Insufficient permissions"
**Cause**: Agent doesn't have the required permission for the endpoint.

**Solution**: 
1. Check what permission is required (shown in error message)
2. Register a new agent with the correct permission
3. Or use an agent with admin permissions (`*:*:*`)

### Error: "Invalid permissions"
**Cause**: One or more permissions don't follow the correct format or refer to non-existent services/resources.

**Solution**: 
1. Check the error response for which specific permissions are invalid
2. Use `GET /permissions/list` to see all valid permissions
3. Ensure format is `service:resource:action`

### Permission Not Working Despite Being Granted
**Cause**: JWT token might be stale and doesn't include the new permission.

**Solution**:
1. Get a fresh token using `POST /agents/verify`
2. Check the token payload includes the permission
3. Ensure you're using the correct authentication header format: `Authorization: Bearer <token>`

## Adding New Services

To add a new service to the permission system, update the `VALID_PERMISSIONS` object in `server.js`:

```javascript
const VALID_PERMISSIONS = {
  // Existing services...
  
  // Add your new service
  notion: ['pages:read', 'pages:write', 'databases:read', 'databases:write'],
};
```

Then create routes that use `requirePermission('notion:pages:read')` etc.

## Support

For questions or issues with the scoped permission system:
- Check this documentation
- Review the example routes in the API
- Contact support with your agent_id and permission error details
