/**
 * Basic usage example for AgentAuth SDK
 *
 * Run with: npx tsx examples/basic-usage.ts
 */

import { AgentAuthClient, Permissions, type Permission } from '../src';

async function main() {
  // Initialize client
  const client = new AgentAuthClient({
    baseURL: process.env.AGENTAUTH_URL || 'http://localhost:3000',
  });

  console.log('🚀 AgentAuth SDK Example\n');

  // 1. Register an agent
  console.log('1️⃣ Registering agent...');
  const permissions: Permission[] = [
    Permissions.Zendesk.Tickets.Read,
    Permissions.Zendesk.Tickets.Write,
    Permissions.Slack.Messages.Write,
    Permissions.HubSpot.Contacts.Read,
  ];

  const { agent, credentials } = await client.registerAgent({
    name: 'Example Support Agent',
    owner_email: 'example@company.com',
    permissions,
  });

  console.log('✅ Agent registered:', agent.agent_id);
  console.log('   API Key:', credentials.api_key.substring(0, 20) + '...');
  console.log('   Permissions:', agent.permissions.length);

  // 2. Verify agent and get JWT token
  console.log('\n2️⃣ Verifying agent...');
  const { token } = await client.verifyAgent({
    agent_id: agent.agent_id,
    api_key: credentials.api_key,
  });

  console.log('✅ Agent verified');
  console.log('   Access Token:', token.access_token.substring(0, 30) + '...');
  console.log('   Expires in:', token.expires_in, 'seconds');

  // 3. Get agent details
  console.log('\n3️⃣ Fetching agent details...');
  const agentDetails = await client.getAgent(agent.agent_id);

  console.log('✅ Agent details retrieved:');
  console.log('   Name:', agentDetails.agent.name);
  console.log('   Status:', agentDetails.agent.status);
  console.log('   Tier:', agentDetails.agent.tier);
  console.log('   Created:', new Date(agentDetails.agent.created_at).toLocaleString());

  // 4. Get activity logs
  console.log('\n4️⃣ Fetching activity logs...');
  const activity = await client.getActivity(agent.agent_id, { limit: 10 });

  console.log('✅ Activity logs retrieved:');
  console.log('   Total events:', activity.pagination.total);
  console.log('   Recent events:', activity.activity.length);

  // 5. List all available permissions
  console.log('\n5️⃣ Listing available permissions...');
  const permissionsList = await client.listPermissions();

  console.log('✅ Available permissions:');
  Object.entries(permissionsList.permissions).forEach(([service, perms]) => {
    console.log(`   ${service}: ${perms.length} permissions`);
  });

  // 6. Health check
  console.log('\n6️⃣ Checking API health...');
  const health = await client.healthCheck();

  console.log('✅ Health check:');
  console.log('   Status:', health.status);
  console.log('   Database:', health.database);

  console.log('\n🎉 Example completed successfully!');
}

// Run the example
main().catch((error) => {
  console.error('❌ Error:', error.message);
  if (error.body) {
    console.error('   Details:', error.body);
  }
  process.exit(1);
});
