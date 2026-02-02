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

__version__ = "0.7.0"

from .client import AgentAuthClient
from .permissions import Permissions, Permission
from .types import (
    Agent,
    RegisterAgentRequest,
    VerifyAgentRequest,
    RefreshTokenRequest,
    Webhook,
    ActivityLog,
    # Persona types
    Persona,
    PersonaPersonality,
    PersonaConstraints,
    PersonaGuardrails,
    PersonaResponse,
    PersonaVerifyResponse,
    PersonaHistoryEntry,
    PersonaHistoryResponse,
    # ZKP types
    RegisterCommitmentRequest,
    RegisterCommitmentResponse,
    VerifyAnonymousRequest,
    VerifyAnonymousResponse,
    # Drift types
    HealthPingRequest,
    HealthPingResponse,
    AnomalyNote,
    DriftScoreResponse,
    DriftTrend,
    DriftHistoryEntry,
    DriftHistoryResponse,
    DriftConfig,
    # Custom errors
    PersonaValidationError,
    DriftThresholdError,
    ZKPVerificationError,
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
    # Persona
    "Persona",
    "PersonaPersonality",
    "PersonaConstraints",
    "PersonaGuardrails",
    "PersonaResponse",
    "PersonaVerifyResponse",
    "PersonaHistoryEntry",
    "PersonaHistoryResponse",
    # ZKP
    "RegisterCommitmentRequest",
    "RegisterCommitmentResponse",
    "VerifyAnonymousRequest",
    "VerifyAnonymousResponse",
    # Drift
    "HealthPingRequest",
    "HealthPingResponse",
    "AnomalyNote",
    "DriftScoreResponse",
    "DriftTrend",
    "DriftHistoryEntry",
    "DriftHistoryResponse",
    "DriftConfig",
    # Errors
    "PersonaValidationError",
    "DriftThresholdError",
    "ZKPVerificationError",
]
