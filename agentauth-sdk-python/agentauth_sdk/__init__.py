"""
AgentAuth SDK - Lightweight, type-safe Python SDK for AI Agent Authentication

Example usage:
    >>> from agentauth_sdk import AgentAuthClient, Permissions
    >>>
    >>> client = AgentAuthClient(base_url="https://auth.yourcompany.com")
    >>>
    >>> # Register agent
    >>> result = await client.register_agent(
    ...     name="Support Agent",
    ...     owner_email="you@company.com",
    ...     permissions=[
    ...         Permissions.Zendesk.Tickets.Read,
    ...         Permissions.Slack.Messages.Write,
    ...     ]
    ... )
"""

__version__ = "0.1.0"

from .client import AgentAuthClient
from .permissions import Permissions, Permission
from .types import (
    Agent,
    RegisterAgentRequest,
    VerifyAgentRequest,
    RefreshTokenRequest,
    Webhook,
    ActivityLog,
)

__all__ = [
    "AgentAuthClient",
    "Permissions",
    "Permission",
    "Agent",
    "RegisterAgentRequest",
    "VerifyAgentRequest",
    "RefreshTokenRequest",
    "Webhook",
    "ActivityLog",
]
