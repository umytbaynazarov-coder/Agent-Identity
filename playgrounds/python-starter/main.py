"""
AgentAuth Python Playground

Try editing the code below and click "Run" to see the results!
This demo connects to a live AgentAuth instance.
"""

import asyncio
import os
from agentauth_sdk import AgentAuthClient, Permissions

async def main():
    """Interactive demo of AgentAuth Python SDK"""
    print('🚀 AgentAuth Python Demo\n')

    # Initialize the client (context manager handles cleanup)
    base_url = os.getenv('AGENTAUTH_BASE_URL', 'https://agentauth-production-b6b2.up.railway.app')

    async with AgentAuthClient(base_url=base_url) as client:
        try:
            # 1. Register an agent with type-safe permissions
            print('📝 Registering agent...')

            result = await client.register_agent(
                name='Demo Agent',
                owner_email='demo@example.com',
                permissions=[
                    Permissions.Zendesk.Tickets.Read,   # ✨ Try changing these!
                    Permissions.Slack.Messages.Write,
                    # Permissions.HubSpot.Contacts.Read,  # Uncomment to add more
                ]
            )

            print('✅ Agent registered!')
            print(f'   Agent ID: {result.agent.agent_id}')
            print(f'   API Key: {result.credentials.api_key[:15]}...')
            print(f'   Permissions: {", ".join(result.agent.permissions)}')

            # 2. Verify agent and get JWT token
            print('\n🔐 Verifying credentials...')

            verify_result = await client.verify_agent(
                agent_id=result.agent.agent_id,
                api_key=result.credentials.api_key
            )

            print('✅ Agent verified!')
            print(f'   Token expires in: {verify_result.token.expires_in} seconds')
            print(f'   Access token: {verify_result.token.access_token[:20]}...')

            # 3. Get agent details (authenticated request)
            print('\n📊 Fetching agent details...')

            agent_details = await client.get_agent(result.agent.agent_id)

            print('✅ Agent details retrieved!')
            print(f'   Name: {agent_details.agent.name}')
            print(f'   Status: {agent_details.agent.status}')
            print(f'   Created: {agent_details.agent.created_at}')

            print('\n🎉 Demo completed successfully!')
            print('\n💡 Try modifying the code above to:')
            print('   - Add more permissions')
            print('   - Change the agent name')
            print('   - Fetch activity logs with client.get_activity()')

        except Exception as error:
            print(f'\n❌ Error: {error}')
            print(f'\n💡 Tip: Make sure the AgentAuth API is running at: {base_url}')

if __name__ == '__main__':
    # Run the async demo
    asyncio.run(main())
