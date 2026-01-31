"""Type definitions for AgentAuth SDK"""

from dataclasses import dataclass
from typing import List, Literal, Optional
from datetime import datetime

from .permissions import Permission


# Agent types
AgentStatus = Literal["active", "inactive", "suspended", "revoked"]
AgentTier = Literal["free", "pro", "enterprise"]


@dataclass
class Agent:
    """Agent model"""

    agent_id: str
    name: str
    owner_email: str
    permissions: List[Permission]
    status: AgentStatus
    tier: AgentTier
    created_at: str
    updated_at: str


@dataclass
class Credentials:
    """Agent credentials"""

    api_key: str
    token_type: Literal["Bearer"] = "Bearer"


@dataclass
class Token:
    """JWT token response"""

    access_token: str
    refresh_token: str
    token_type: Literal["Bearer"]
    expires_in: int


# Request types
@dataclass
class RegisterAgentRequest:
    """Request to register a new agent"""

    name: str
    owner_email: str
    permissions: List[Permission]


@dataclass
class VerifyAgentRequest:
    """Request to verify agent credentials"""

    agent_id: str
    api_key: str


@dataclass
class RefreshTokenRequest:
    """Request to refresh access token"""

    refresh_token: str


# Response types
@dataclass
class RegisterAgentResponse:
    """Response from agent registration"""

    success: bool
    message: str
    agent: Agent
    credentials: Credentials


@dataclass
class VerifyAgentResponse:
    """Response from agent verification"""

    success: bool
    message: str
    agent: Agent
    token: Token


@dataclass
class RefreshTokenResponse:
    """Response from token refresh"""

    success: bool
    message: str
    token: Token


@dataclass
class ActivityLog:
    """Agent activity log entry"""

    id: str
    agent_id: str
    timestamp: str
    ip_address: str
    status: Literal["success", "failure"]
    message: Optional[str] = None


@dataclass
class Pagination:
    """Pagination metadata"""

    total: int
    limit: int
    offset: int
    has_more: bool


@dataclass
class GetActivityResponse:
    """Response from activity log query"""

    success: bool
    agent_id: str
    activity: List[ActivityLog]
    pagination: Pagination


@dataclass
class Webhook:
    """Webhook configuration"""

    id: str
    agent_id: str
    url: str
    events: List[str]
    secret: str
    created_at: str


@dataclass
class RegisterWebhookRequest:
    """Request to register a webhook"""

    url: str
    events: List[str]


@dataclass
class HealthCheckResponse:
    """Health check response"""

    status: Literal["healthy", "unhealthy"]
    database: Literal["connected", "disconnected"]
    timestamp: str


# Configuration
@dataclass
class AgentAuthConfig:
    """AgentAuth client configuration"""

    base_url: str
    api_key: Optional[str] = None
    access_token: Optional[str] = None
    max_retries: int = 3
    timeout: float = 10.0
