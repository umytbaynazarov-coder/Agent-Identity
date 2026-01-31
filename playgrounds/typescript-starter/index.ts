import { AgentAuthClient, Permissions } from '@umytbaynazarow/agentauth-sdk';

/**
 * AgentAuth TypeScript Playground
 *
 * Try editing the code below and click "Run" to see the results!
 * This demo connects to a live AgentAuth instance.
 */

async function main() {
  console.log('🚀 AgentAuth TypeScript Demo\n');

  // Initialize the client
  const client = new AgentAuthClient({
    baseURL: process.env.AGENTAUTH_BASE_URL || 'https://agentauth-production-b6b2.up.railway.app',
  });

  try {
    // 1. Register an agent with type-safe permissions
    console.log('📝 Registering agent...');

    const { agent, credentials } = await client.registerAgent({
      name: 'Demo Agent',
      owner_email: 'demo@example.com',
      permissions: [
        Permissions.Zendesk.Tickets.Read,   // ✨ Try changing these!
        Permissions.Slack.Messages.Write,
        // Permissions.HubSpot.Contacts.Read,  // Uncomment to add more
      ],
    });

    console.log('✅ Agent registered!');
    console.log('   Agent ID:', agent.agent_id);
    console.log('   API Key:', credentials.api_key.substring(0, 15) + '...');
    console.log('   Permissions:', agent.permissions.join(', '));

    // 2. Verify agent and get JWT token
    console.log('\n🔐 Verifying credentials...');

    const { token } = await client.verifyAgent({
      agent_id: agent.agent_id,
      api_key: credentials.api_key,
    });

    console.log('✅ Agent verified!');
    console.log('   Token expires in:', token.expires_in, 'seconds');
    console.log('   Access token:', token.access_token.substring(0, 20) + '...');

    // 3. Get agent details (authenticated request)
    console.log('\n📊 Fetching agent details...');

    const agentDetails = await client.getAgent(agent.agent_id);

    console.log('✅ Agent details retrieved!');
    console.log('   Name:', agentDetails.agent.name);
    console.log('   Status:', agentDetails.agent.status);
    console.log('   Created:', new Date(agentDetails.agent.created_at).toLocaleString());

    console.log('\n🎉 Demo completed successfully!');
    console.log('\n💡 Try modifying the code above to:');
    console.log('   - Add more permissions');
    console.log('   - Change the agent name');
    console.log('   - Fetch activity logs with client.getActivity()');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    console.log('\n💡 Tip: Make sure the AgentAuth API is running at:',
                process.env.AGENTAUTH_BASE_URL || 'https://agentauth-production-b6b2.up.railway.app');
  }
}

// Run the demo
main().catch(console.error);
