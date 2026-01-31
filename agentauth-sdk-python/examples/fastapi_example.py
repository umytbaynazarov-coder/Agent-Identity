"""
FastAPI integration example for AgentAuth SDK
"""

from fastapi import FastAPI, Depends, HTTPException, Header
from agentauth_sdk import AgentAuthClient, Permissions, Permission
from typing import List, Optional

app = FastAPI(title="AgentAuth FastAPI Example")

# Initialize client
auth_client = AgentAuthClient(base_url="https://auth.yourcompany.com")


# Dependency to verify JWT token
async def verify_token(authorization: Optional[str] = Header(None)):
    """Verify JWT token from Authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")

    token = authorization.split(" ")[1]
    auth_client.set_access_token(token)
    return token


@app.post("/agents/register")
async def register_agent(
    name: str,
    email: str,
    permissions: List[Permission],
):
    """Register a new agent"""
    result = await auth_client.register_agent(
        name=name,
        owner_email=email,
        permissions=permissions,
    )
    return {
        "agent_id": result.agent.agent_id,
        "api_key": result.credentials.api_key,
        "message": "Agent registered successfully",
    }


@app.post("/agents/verify")
async def verify_agent(agent_id: str, api_key: str):
    """Verify agent credentials"""
    result = await auth_client.verify_agent(
        agent_id=agent_id,
        api_key=api_key,
    )
    return {
        "access_token": result.token.access_token,
        "refresh_token": result.token.refresh_token,
        "expires_in": result.token.expires_in,
    }


@app.get("/agents/{agent_id}")
async def get_agent(agent_id: str, _token: str = Depends(verify_token)):
    """Get agent details (authenticated)"""
    agent = await auth_client.get_agent(agent_id)
    return agent


@app.get("/agents/{agent_id}/activity")
async def get_activity(
    agent_id: str,
    limit: int = 50,
    offset: int = 0,
    _token: str = Depends(verify_token),
):
    """Get agent activity logs"""
    result = await auth_client.get_activity(
        agent_id=agent_id,
        limit=limit,
        offset=offset,
    )
    return result


@app.on_event("shutdown")
async def shutdown():
    """Clean up on shutdown"""
    await auth_client.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
