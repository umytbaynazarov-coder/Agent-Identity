"""
Basic usage example for AgentAuth Python SDK
"""

import asyncio
from agentauth_sdk import AgentAuthClient, Permissions


async def main():
    print("🚀 AgentAuth Python SDK Example\n")

    # Initialize client
    async with AgentAuthClient(base_url="http://localhost:3000") as client:
        # 1. Register an agent
        print("1️⃣ Registering agent...")
        result = await client.register_agent(
            name="Example Support Agent",
            owner_email="example@company.com",
            permissions=[
                Permissions.Zendesk.Tickets.Read,
                Permissions.Zendesk.Tickets.Write,
                Permissions.Slack.Messages.Write,
                Permissions.HubSpot.Contacts.Read,
            ],
        )

        print(f"✅ Agent registered: {result.agent.agent_id}")
        print(f"   API Key: {result.credentials.api_key[:20]}...")
        print(f"   Permissions: {len(result.agent.permissions)}")

        # 2. Verify agent
        print("\n2️⃣ Verifying agent...")
        verify_result = await client.verify_agent(
            agent_id=result.agent.agent_id,
            api_key=result.credentials.api_key,
        )

        print("✅ Agent verified")
        print(f"   Access Token: {verify_result.token.access_token[:30]}...")
        print(f"   Expires in: {verify_result.token.expires_in}s")

        # 3. Get agent details
        print("\n3️⃣ Fetching agent details...")
        agent = await client.get_agent(result.agent.agent_id)

        print("✅ Agent details retrieved:")
        print(f"   Name: {agent.name}")
        print(f"   Status: {agent.status}")
        print(f"   Tier: {agent.tier}")

        # 4. Get activity logs
        print("\n4️⃣ Fetching activity logs...")
        activity = await client.get_activity(
            result.agent.agent_id,
            limit=10,
        )

        print("✅ Activity logs retrieved:")
        print(f"   Total events: {activity.pagination.total}")
        print(f"   Recent events: {len(activity.activity)}")

        # 5. List permissions
        print("\n5️⃣ Listing available permissions...")
        permissions = await client.list_permissions()

        print("✅ Available permissions:")
        for service, perms in permissions["permissions"].items():
            print(f"   {service}: {len(perms)} permissions")

        # 6. Health check
        print("\n6️⃣ Checking API health...")
        health = await client.health_check()

        print("✅ Health check:")
        print(f"   Status: {health.status}")
        print(f"   Database: {health.database}")

        print("\n🎉 Example completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
