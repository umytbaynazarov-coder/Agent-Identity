# Migration Guide: v0.1.0 → v0.2.0 (Scoped Permissions)

## Overview

Version 0.2.0 introduces a **breaking change** to the permission system. The old flat permission model (`read`, `write`, `admin`) has been replaced with a scoped permission system (`service:resource:action`).

This guide will help you migrate your existing agents to the new system.

## What Changed

### Old Permission System (v0.1.0)
```json
{
  "permissions": ["read", "write", "admin"]
}
```

### New Permission System (v0.2.0)
```json
{
  "permissions": [
    "zendesk:tickets:read",
    "slack:messages:write",
    "*:*:*"
  ]
}
```

## Breaking Changes

1. **Permission Format**: Old permissions (`read`, `write`, etc.) are no longer valid
2. **Default Permission**: Changed from `['read']` to `['zendesk:tickets:read']`
3. **Permission Validation**: Now validates service, resource, and action combinations
4. **Admin Permission**: Changed from `admin` to `*:*:*`

## Migration Steps

### Step 1: Identify Your Current Agents

List all your existing agents:

```bash
curl https://your-api.com/agents \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Document their current permissions.

### Step 2: Map Old Permissions to New Format

Use this mapping table:

| Old Permission | Suggested New Permission(s) | Notes |
|---------------|----------------------------|-------|
| `read` | `zendesk:tickets:read`<br>`slack:messages:read`<br>`hubspot:contacts:read` | Choose based on what the agent actually needs to read |
| `write` | `zendesk:tickets:write`<br>`slack:messages:write`<br>`hubspot:contacts:write` | Choose based on what the agent needs to write |
| `admin` | `*:*:*` | Full admin access |
| `delete` | `zendesk:tickets:write`<br>`hubspot:contacts:write` | Deletion is now part of write permissions |

### Step 3: Register New Agents with Scoped Permissions

For each existing agent, register a new one with the appropriate scoped permissions:

```bash
# Example: Old agent with ["read", "write"]
# New agent with scoped permissions

curl -X POST https://your-api.com/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "customer-support-agent-v2",
    "owner_email": "you@company.com",
    "description": "Migrated from v0.1.0",
    "permissions": [
      "zendesk:tickets:read",
      "zendesk:tickets:write",
      "slack:messages:write",
      "hubspot:contacts:read"
    ]
  }'
```

Save the new `agent_id` and `api_key`.

### Step 4: Update Your Application

Update your application code to use the new agent credentials:

```javascript
// Old code
const agent = {
  agent_id: 'agt_old123',
  api_key: 'ak_old456'
};

// New code
const agent = {
  agent_id: 'agt_new789',  // New agent ID
  api_key: 'ak_new012'     // New API key
};
```

### Step 5: Test Thoroughly

Test all agent functionality with the new permissions:

```bash
# Verify the new agent
curl -X POST https://your-api.com/agents/verify \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agt_new789",
    "api_key": "ak_new012"
  }'

# Test access to protected resources
curl https://your-api.com/integrations/zendesk/tickets \
  -H "Authorization: Bearer YOUR_NEW_TOKEN"
```

### Step 6: Revoke Old Agents

Once you've confirmed the new agents work correctly, revoke the old ones:

```bash
curl -X POST https://your-api.com/agents/agt_old123/revoke \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Common Migration Scenarios

### Scenario 1: Read-Only Agent

**Old (v0.1.0):**
```json
{
  "name": "analytics-agent",
  "permissions": ["read"]
}
```

**New (v0.2.0):**
```json
{
  "name": "analytics-agent",
  "permissions": [
    "zendesk:tickets:read",
    "zendesk:users:read",
    "hubspot:contacts:read",
    "hubspot:deals:read",
    "salesforce:accounts:read"
  ]
}
```

### Scenario 2: Full Access Agent

**Old (v0.1.0):**
```json
{
  "name": "admin-agent",
  "permissions": ["admin"]
}
```

**New (v0.2.0):**
```json
{
  "name": "admin-agent",
  "permissions": ["*:*:*"]
}
```

### Scenario 3: Customer Support Agent

**Old (v0.1.0):**
```json
{
  "name": "support-agent",
  "permissions": ["read", "write"]
}
```

**New (v0.2.0):**
```json
{
  "name": "support-agent",
  "permissions": [
    "zendesk:tickets:read",
    "zendesk:tickets:write",
    "zendesk:users:read",
    "slack:messages:write",
    "hubspot:contacts:read"
  ]
}
```

### Scenario 4: Sales Agent

**Old (v0.1.0):**
```json
{
  "name": "sales-agent",
  "permissions": ["read", "write"]
}
```

**New (v0.2.0):**
```json
{
  "name": "sales-agent",
  "permissions": [
    "hubspot:contacts:read",
    "hubspot:contacts:write",
    "hubspot:deals:read",
    "hubspot:deals:write",
    "salesforce:leads:read",
    "salesforce:leads:write",
    "slack:messages:write"
  ]
}
```

## Automation Script

Here's a Node.js script to help automate the migration:

```javascript
// migrate-agents.js
const API_BASE = 'https://your-api.com';
const ADMIN_TOKEN = 'your_admin_token_here';

// Define your migration mappings
const PERMISSION_MAPPING = {
  'read': [
    'zendesk:tickets:read',
    'slack:messages:read',
    'hubspot:contacts:read'
  ],
  'write': [
    'zendesk:tickets:write',
    'slack:messages:write',
    'hubspot:contacts:write'
  ],
  'admin': ['*:*:*']
};

async function migrateAgents() {
  // 1. Get all existing agents
  const response = await fetch(`${API_BASE}/agents`, {
    headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
  });
  const { agents } = await response.json();
  
  console.log(`Found ${agents.length} agents to migrate`);
  
  for (const agent of agents) {
    console.log(`\nMigrating agent: ${agent.name} (${agent.agent_id})`);
    
    // 2. Map old permissions to new ones
    const newPermissions = new Set();
    for (const oldPerm of agent.permissions) {
      const mappedPerms = PERMISSION_MAPPING[oldPerm] || [];
      mappedPerms.forEach(p => newPermissions.add(p));
    }
    
    if (newPermissions.size === 0) {
      console.log('  ⚠️  No permissions mapped, using default');
      newPermissions.add('zendesk:tickets:read');
    }
    
    console.log(`  Old permissions: ${agent.permissions.join(', ')}`);
    console.log(`  New permissions: ${Array.from(newPermissions).join(', ')}`);
    
    // 3. Register new agent
    const registerResponse = await fetch(`${API_BASE}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${agent.name}-v2`,
        owner_email: agent.owner_email,
        description: `Migrated from ${agent.agent_id}`,
        permissions: Array.from(newPermissions)
      })
    });
    
    const newAgent = await registerResponse.json();
    
    if (newAgent.success) {
      console.log(`  ✅ Created new agent: ${newAgent.agent.agent_id}`);
      console.log(`  📝 Save this API key: ${newAgent.credentials.api_key}`);
      
      // Note: You may want to automatically revoke the old agent here
      // after confirming the new one works
    } else {
      console.log(`  ❌ Failed to create new agent:`, newAgent.error);
    }
  }
}

migrateAgents().catch(console.error);
```

Run it with:
```bash
node migrate-agents.js
```

## Validation Checklist

Use this checklist to ensure a successful migration:

- [ ] Listed all existing agents and their permissions
- [ ] Created mapping from old to new permissions
- [ ] Registered new agents with scoped permissions
- [ ] Updated application code with new credentials
- [ ] Tested all agent functionality
- [ ] Verified permission checks work as expected
- [ ] Documented new agent credentials securely
- [ ] Revoked old agents
- [ ] Updated documentation/runbooks
- [ ] Notified team members of the changes

## Rollback Plan

If you need to rollback to v0.1.0:

1. **Keep old agents active** during migration period
2. **Don't revoke old agents** until new ones are confirmed working
3. **Deploy old version** if critical issues arise
4. **Switch back to old credentials** in your application

## FAQ

### Can I use both old and new agents simultaneously?

No. The v0.2.0 API only accepts the new scoped permission format. You must migrate all agents.

### What if I have custom permissions?

If you had custom permissions beyond `read`, `write`, `admin`, you'll need to:
1. Add them to `VALID_PERMISSIONS` in `server.js`
2. Follow the `service:resource:action` format
3. Redeploy the API

### How do I know which specific permissions to grant?

Look at what your agent actually does:
- **Reading Zendesk tickets?** → `zendesk:tickets:read`
- **Posting to Slack?** → `slack:messages:write`
- **Updating HubSpot contacts?** → `hubspot:contacts:write`

Start narrow and expand as needed.

### Can I use wildcards for everything?

While you *can* use `*:*:*` for admin access, it's not recommended for regular agents. Follow the **principle of least privilege** and grant only what's needed.

### What happens to JWT tokens from old agents?

Old JWT tokens will become invalid because:
1. The permission format in the token won't match the new validation
2. Old agents will be revoked

You'll need to get new tokens from new agents.

## Support

If you encounter issues during migration:

1. Check the [Scoped Permissions Documentation](SCOPED_PERMISSIONS.md)
2. Test with the `/permissions/list` endpoint to see valid permissions
3. Use the test suite to verify functionality: `node test.js`
4. Check agent activity logs: `GET /agents/:id/activity`

## Timeline Recommendation

1. **Week 1**: Test migration in development
2. **Week 2**: Migrate staging environment
3. **Week 3**: Migrate production (gradual rollout)
4. **Week 4**: Revoke old agents after confirmation

## Benefits of Migration

After migration, you'll enjoy:

- **Granular Control**: Specify exactly what each agent can access
- **Better Security**: Principle of least privilege
- **Audit Clarity**: Know precisely what permissions were used
- **Industry Standard**: Familiar Auth0/AWS IAM-style permissions
- **Scalability**: Easily add new services and resources

Good luck with your migration! 🚀
