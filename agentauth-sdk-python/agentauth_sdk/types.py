"""Type definitions for AgentAuth SDK"""

from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional
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


# ============================================
# Persona Types
# ============================================


@dataclass
class PersonaConstraints:
    """Persona constraints configuration"""

    max_response_length: Optional[int] = None
    forbidden_topics: Optional[List[str]] = None
    required_disclaimers: Optional[List[str]] = None
    allowed_actions: Optional[List[str]] = None
    blocked_actions: Optional[List[str]] = None


@dataclass
class PersonaGuardrails:
    """Persona guardrails configuration"""

    toxicity_threshold: Optional[float] = None
    hallucination_tolerance: Optional[Literal["strict", "moderate", "lenient"]] = None
    source_citation_required: Optional[bool] = None


@dataclass
class PersonaPersonality:
    """Persona personality configuration"""

    traits: Optional[Dict[str, Any]] = None
    assistant_axis: Optional[List[str]] = None
    neural_vectors: Optional[Dict[str, float]] = None


@dataclass
class Persona:
    """
    Agent persona definition ("Digital Soul").

    Example:
        >>> persona = Persona(
        ...     version="1.0.0",
        ...     personality=PersonaPersonality(
        ...         traits={"helpfulness": 0.9, "formality": 0.7}
        ...     ),
        ...     guardrails=PersonaGuardrails(toxicity_threshold=0.3),
        ... )
    """

    version: str
    personality: Optional[PersonaPersonality] = None
    constraints: Optional[PersonaConstraints] = None
    guardrails: Optional[PersonaGuardrails] = None
    prompt_template: Optional[str] = None


@dataclass
class PersonaResponse:
    """Response from persona operations"""

    agent_id: str
    persona: Dict[str, Any]
    persona_hash: str
    persona_version: str
    prompt: Optional[str] = None
    etag: Optional[str] = None


@dataclass
class PersonaVerifyResponse:
    """Response from persona integrity verification"""

    valid: bool
    agent_id: str
    persona_hash: str
    reason: str


@dataclass
class PersonaHistoryEntry:
    """Single entry in persona version history"""

    id: str
    agent_id: str
    persona: Dict[str, Any]
    persona_hash: str
    persona_version: str
    changed_at: str


@dataclass
class PersonaHistoryResponse:
    """Paginated persona history response"""

    history: List[PersonaHistoryEntry]
    total: int
    limit: int
    offset: int


# ============================================
# ZKP Types
# ============================================


@dataclass
class RegisterCommitmentRequest:
    """
    Request to register a ZKP commitment.

    Example:
        >>> req = RegisterCommitmentRequest(
        ...     agent_id="agt_abc123",
        ...     api_key="sk_xxx",
        ...     expires_in=3600,
        ... )
    """

    agent_id: str
    api_key: str
    expires_in: Optional[int] = None


@dataclass
class RegisterCommitmentResponse:
    """Response from commitment registration (salt shown once)"""

    commitment: str
    salt: str
    expires_at: Optional[str]
    message: str


@dataclass
class VerifyAnonymousRequest:
    """
    Request to verify a commitment anonymously.

    Example (hash mode):
        >>> req = VerifyAnonymousRequest(
        ...     commitment="abc123...",
        ...     mode="hash",
        ...     preimage_hash="abc123...",
        ... )
    """

    commitment: str
    mode: Optional[Literal["zkp", "hash"]] = None
    proof: Optional[Dict[str, Any]] = None
    public_signals: Optional[List[str]] = None
    preimage_hash: Optional[str] = None


@dataclass
class VerifyAnonymousResponse:
    """Response from anonymous verification"""

    valid: bool
    reason: str
    permissions: Optional[List[str]] = None
    tier: Optional[str] = None


# ============================================
# Drift Types
# ============================================


@dataclass
class HealthPingRequest:
    """
    Health ping submission with metrics.

    Example:
        >>> ping = HealthPingRequest(
        ...     metrics={"toxicity_score": 0.15, "response_adherence": 0.92},
        ...     request_count=150,
        ... )
    """

    metrics: Dict[str, float]
    request_count: Optional[int] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    signature: Optional[str] = None


@dataclass
class AnomalyNote:
    """Spike detection anomaly detail"""

    metric: str
    delta: float
    threshold: float
    mean: float
    stddev: float
    current_value: float


@dataclass
class HealthPingResponse:
    """Response from health ping submission"""

    ping_id: str
    drift_score: float
    status: Literal["ok", "warning", "revoked"]
    warning: Optional[Dict[str, Any]] = None
    anomaly_notes: Optional[List[AnomalyNote]] = None


@dataclass
class DriftTrend:
    """Single trend data point"""

    drift_score: float
    created_at: str


@dataclass
class DriftScoreResponse:
    """Current drift score with thresholds and trend"""

    agent_id: str
    drift_score: Optional[float]
    thresholds: Optional[Dict[str, Any]] = None
    trend: Optional[List[DriftTrend]] = None
    spike_warnings: Optional[List[AnomalyNote]] = None
    message: Optional[str] = None


@dataclass
class DriftHistoryEntry:
    """Single entry in drift history"""

    id: str
    agent_id: str
    drift_score: float
    created_at: str
    metrics: Optional[Dict[str, float]] = None
    request_count: Optional[int] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


@dataclass
class DriftHistoryResponse:
    """Paginated drift history response"""

    history: List[DriftHistoryEntry]
    total: int
    limit: int
    offset: int


@dataclass
class DriftConfig:
    """
    Drift configuration for an agent.

    Example:
        >>> config = DriftConfig(
        ...     agent_id="agt_abc123",
        ...     drift_threshold=0.30,
        ...     warning_threshold=0.24,
        ...     spike_sensitivity=2.0,
        ... )
    """

    agent_id: str
    drift_threshold: float = 0.30
    warning_threshold: float = 0.24
    auto_revoke: bool = True
    metric_weights: Optional[Dict[str, float]] = None
    baseline_metrics: Optional[Dict[str, float]] = None
    spike_sensitivity: float = 2.0


# ============================================
# Custom Errors
# ============================================


class PersonaValidationError(Exception):
    """Raised when persona validation fails"""

    def __init__(self, message: str, errors: Optional[List[Dict[str, str]]] = None):
        super().__init__(message)
        self.status_code = 400
        self.errors = errors or []


class DriftThresholdError(Exception):
    """Raised when drift threshold is exceeded"""

    def __init__(self, message: str, drift_score: float, threshold: float):
        super().__init__(message)
        self.status_code = 409
        self.drift_score = drift_score
        self.threshold = threshold


class ZKPVerificationError(Exception):
    """Raised when ZKP verification fails"""

    def __init__(self, message: str, reason: str):
        super().__init__(message)
        self.status_code = 401
        self.reason = reason


# Configuration
@dataclass
class AgentAuthConfig:
    """AgentAuth client configuration"""

    base_url: str
    api_key: Optional[str] = None
    access_token: Optional[str] = None
    max_retries: int = 3
    timeout: float = 10.0
