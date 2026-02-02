"""AgentAuth SDK Client"""

from typing import List, Optional, Dict, Any
import httpx

from .types import (
    Agent,
    RegisterAgentRequest,
    RegisterAgentResponse,
    VerifyAgentRequest,
    VerifyAgentResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    GetActivityResponse,
    RegisterWebhookRequest,
    Webhook,
    HealthCheckResponse,
    AgentTier,
    Persona,
    PersonaResponse,
    PersonaVerifyResponse,
    PersonaHistoryResponse,
    PersonaHistoryEntry,
    RegisterCommitmentRequest,
    RegisterCommitmentResponse,
    VerifyAnonymousRequest,
    VerifyAnonymousResponse,
    HealthPingRequest,
    HealthPingResponse,
    DriftScoreResponse,
    DriftHistoryResponse,
    DriftHistoryEntry,
    DriftConfig,
    AnomalyNote,
    DriftTrend,
)
from .permissions import Permission
from .utils import retry_with_backoff, validate_base_url, AgentAuthError


class AgentAuthClient:
    """
    Async client for AgentAuth API

    Example:
        >>> client = AgentAuthClient(base_url="https://auth.yourcompany.com")
        >>> result = await client.register_agent(
        ...     name="Support Agent",
        ...     owner_email="you@company.com",
        ...     permissions=[Permissions.Zendesk.Tickets.Read]
        ... )
    """

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        access_token: Optional[str] = None,
        max_retries: int = 3,
        timeout: float = 10.0,
    ):
        """
        Initialize AgentAuth client

        Args:
            base_url: Base URL of AgentAuth API
            api_key: Optional API key for authentication
            access_token: Optional JWT access token
            max_retries: Maximum retry attempts (default: 3)
            timeout: Request timeout in seconds (default: 10.0)
        """
        validate_base_url(base_url)
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.access_token = access_token
        self.max_retries = max_retries
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self):
        """Async context manager entry"""
        self._client = httpx.AsyncClient(timeout=self.timeout)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self._client:
            await self._client.aclose()

    def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client

    def set_access_token(self, token: str) -> None:
        """Set access token for authenticated requests"""
        self.access_token = token

    def set_api_key(self, api_key: str) -> None:
        """Set API key for authentication"""
        self.api_key = api_key

    async def _request(
        self,
        method: str,
        path: str,
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        requires_auth: bool = False,
    ) -> Dict[str, Any]:
        """
        Make HTTP request with retry logic

        Args:
            method: HTTP method
            path: API path
            json: Request body (for POST/PUT)
            params: Query parameters
            requires_auth: Whether request requires authentication

        Returns:
            Response JSON

        Raises:
            AgentAuthError: On request failure
        """

        async def make_request():
            client = self._get_client()
            url = f"{self.base_url}{path}"
            headers = {"Content-Type": "application/json"}

            if requires_auth and self.access_token:
                headers["Authorization"] = f"Bearer {self.access_token}"

            try:
                response = await client.request(
                    method=method,
                    url=url,
                    json=json,
                    params=params,
                    headers=headers,
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                error_body = {}
                try:
                    error_body = e.response.json()
                except Exception:
                    pass

                raise AgentAuthError(
                    message=error_body.get("error", str(e)),
                    status_code=e.response.status_code,
                    details=error_body,
                )

        return await retry_with_backoff(
            make_request,
            max_retries=self.max_retries,
        )

    # ============================================
    # Agent Management
    # ============================================

    async def register_agent(
        self,
        name: str,
        owner_email: str,
        permissions: List[Permission],
    ) -> RegisterAgentResponse:
        """
        Register a new agent

        Args:
            name: Agent name
            owner_email: Owner email
            permissions: List of permissions

        Returns:
            RegisterAgentResponse with agent details and credentials
        """
        data = await self._request(
            "POST",
            "/agents/register",
            json={
                "name": name,
                "owner_email": owner_email,
                "permissions": permissions,
            },
        )
        return RegisterAgentResponse(**data)

    async def verify_agent(
        self,
        agent_id: str,
        api_key: str,
    ) -> VerifyAgentResponse:
        """
        Verify agent credentials and get JWT token

        Args:
            agent_id: Agent ID
            api_key: API key

        Returns:
            VerifyAgentResponse with JWT tokens
        """
        data = await self._request(
            "POST",
            "/agents/verify",
            json={"agent_id": agent_id, "api_key": api_key},
        )
        response = VerifyAgentResponse(**data)

        # Auto-update access token
        self.set_access_token(response.token.access_token)

        return response

    async def refresh_token(
        self,
        refresh_token: str,
    ) -> RefreshTokenResponse:
        """
        Refresh access token

        Args:
            refresh_token: Refresh token

        Returns:
            RefreshTokenResponse with new tokens
        """
        data = await self._request(
            "POST",
            "/agents/refresh",
            json={"refresh_token": refresh_token},
        )
        response = RefreshTokenResponse(**data)

        # Auto-update access token
        self.set_access_token(response.token.access_token)

        return response

    async def revoke_tokens(self) -> Dict[str, Any]:
        """
        Revoke all refresh tokens for authenticated agent

        Returns:
            Success response
        """
        return await self._request(
            "POST",
            "/agents/revoke-tokens",
            requires_auth=True,
        )

    async def list_agents(self) -> List[Agent]:
        """
        List all agents (admin only)

        Returns:
            List of agents
        """
        data = await self._request("GET", "/agents", requires_auth=True)
        return [Agent(**agent) for agent in data["agents"]]

    async def get_agent(self, agent_id: str) -> Agent:
        """
        Get agent details

        Args:
            agent_id: Agent ID

        Returns:
            Agent details
        """
        data = await self._request(
            "GET",
            f"/agents/{agent_id}",
            requires_auth=True,
        )
        return Agent(**data["agent"])

    async def revoke_agent(self, agent_id: str) -> Dict[str, Any]:
        """
        Revoke/deactivate an agent

        Args:
            agent_id: Agent ID

        Returns:
            Success response
        """
        return await self._request(
            "POST",
            f"/agents/{agent_id}/revoke",
            requires_auth=True,
        )

    async def get_activity(
        self,
        agent_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> GetActivityResponse:
        """
        Get activity logs for an agent

        Args:
            agent_id: Agent ID
            limit: Number of logs to return
            offset: Offset for pagination

        Returns:
            Activity logs with pagination
        """
        data = await self._request(
            "GET",
            f"/agents/{agent_id}/activity",
            params={"limit": limit, "offset": offset},
            requires_auth=True,
        )
        return GetActivityResponse(**data)

    async def update_agent_tier(
        self,
        agent_id: str,
        tier: AgentTier,
    ) -> Agent:
        """
        Update agent tier (admin only)

        Args:
            agent_id: Agent ID
            tier: New tier

        Returns:
            Updated agent
        """
        data = await self._request(
            "PUT",
            f"/agents/{agent_id}/tier",
            json={"tier": tier},
            requires_auth=True,
        )
        return Agent(**data["agent"])

    # ============================================
    # Webhooks
    # ============================================

    async def register_webhook(
        self,
        url: str,
        events: List[str],
    ) -> Webhook:
        """
        Register a webhook

        Args:
            url: Webhook URL
            events: List of events to subscribe to

        Returns:
            Webhook configuration
        """
        data = await self._request(
            "POST",
            "/webhooks",
            json={"url": url, "events": events},
            requires_auth=True,
        )
        return Webhook(**data["webhook"])

    async def list_webhooks(self) -> List[Webhook]:
        """
        List all webhooks for authenticated agent

        Returns:
            List of webhooks
        """
        data = await self._request("GET", "/webhooks", requires_auth=True)
        return [Webhook(**wh) for wh in data["webhooks"]]

    async def delete_webhook(self, webhook_id: str) -> Dict[str, Any]:
        """
        Delete a webhook

        Args:
            webhook_id: Webhook ID

        Returns:
            Success response
        """
        return await self._request(
            "DELETE",
            f"/webhooks/{webhook_id}",
            requires_auth=True,
        )

    async def regenerate_webhook_secret(self, webhook_id: str) -> Webhook:
        """
        Regenerate webhook secret

        Args:
            webhook_id: Webhook ID

        Returns:
            Updated webhook with new secret
        """
        data = await self._request(
            "POST",
            f"/webhooks/{webhook_id}/regenerate-secret",
            requires_auth=True,
        )
        return Webhook(**data["webhook"])

    # ============================================
    # Utilities
    # ============================================

    async def list_permissions(self) -> Dict[str, Any]:
        """
        List all available permissions

        Returns:
            Permission listing
        """
        return await self._request("GET", "/permissions/list")

    async def health_check(self) -> HealthCheckResponse:
        """
        Check API health

        Returns:
            Health check response
        """
        data = await self._request("GET", "/health")
        return HealthCheckResponse(**data)

    # ============================================
    # Persona ("Soul Layer")
    # ============================================

    async def register_persona(
        self,
        agent_id: str,
        persona: Dict[str, Any],
    ) -> PersonaResponse:
        """
        Register a persona for an agent.

        Args:
            agent_id: Agent ID
            persona: Persona definition dict

        Returns:
            PersonaResponse with hash and version
        """
        headers: Dict[str, str] = {}
        if self.api_key:
            headers["X-Api-Key"] = self.api_key

        data = await self._request(
            "POST",
            f"/agents/{agent_id}/persona",
            json=persona,
            requires_auth=True,
        )
        return PersonaResponse(**data)

    async def get_persona(
        self,
        agent_id: str,
        include_prompt: bool = False,
        etag: Optional[str] = None,
    ) -> Optional[PersonaResponse]:
        """
        Get persona for an agent. Supports ETag-based caching.

        Args:
            agent_id: Agent ID
            include_prompt: Whether to include generated prompt
            etag: Optional ETag for conditional request

        Returns:
            PersonaResponse or None if not modified (304)
        """
        params: Dict[str, Any] = {}
        if include_prompt:
            params["includePrompt"] = "true"

        data = await self._request(
            "GET",
            f"/agents/{agent_id}/persona",
            params=params if params else None,
        )
        return PersonaResponse(**data)

    async def get_persona_history(
        self,
        agent_id: str,
        limit: int = 10,
        offset: int = 0,
        sort: str = "desc",
        format: str = "json",
    ) -> PersonaHistoryResponse:
        """
        Get persona version history.

        Args:
            agent_id: Agent ID
            limit: Number of entries to return
            offset: Offset for pagination
            sort: Sort order ('asc' or 'desc')
            format: Output format ('json' or 'csv')

        Returns:
            PersonaHistoryResponse with paginated history
        """
        data = await self._request(
            "GET",
            f"/agents/{agent_id}/persona/history",
            params={"limit": limit, "offset": offset, "sort": sort, "format": format},
        )
        return PersonaHistoryResponse(**data)

    async def update_persona(
        self,
        agent_id: str,
        persona: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Update persona for an agent. Auto-bumps minor version.

        Args:
            agent_id: Agent ID
            persona: Updated persona definition

        Returns:
            Updated persona with version info and diff
        """
        return await self._request(
            "PUT",
            f"/agents/{agent_id}/persona",
            json=persona,
            requires_auth=True,
        )

    async def verify_persona(self, agent_id: str) -> PersonaVerifyResponse:
        """
        Verify persona integrity (HMAC-SHA256 check).

        Args:
            agent_id: Agent ID

        Returns:
            PersonaVerifyResponse with validity status
        """
        data = await self._request(
            "POST",
            f"/agents/{agent_id}/persona/verify",
            requires_auth=True,
        )
        return PersonaVerifyResponse(**data)

    async def export_persona(self, agent_id: str) -> bytes:
        """
        Export persona as a signed ZIP bundle.

        Args:
            agent_id: Agent ID

        Returns:
            ZIP file bytes
        """
        client = self._get_client()
        url = f"{self.base_url}/agents/{agent_id}/persona/export"
        response = await client.get(url)
        response.raise_for_status()
        return response.content

    async def import_persona(
        self,
        agent_id: str,
        bundle: Dict[str, Any],
    ) -> PersonaResponse:
        """
        Import a signed persona bundle.

        Args:
            agent_id: Agent ID
            bundle: Bundle with persona, persona_hash, and signature

        Returns:
            PersonaResponse for the imported persona
        """
        data = await self._request(
            "POST",
            f"/agents/{agent_id}/persona/import",
            json=bundle,
            requires_auth=True,
        )
        return PersonaResponse(**data)

    # ============================================
    # ZKP Anonymous Verification
    # ============================================

    async def register_commitment(
        self,
        agent_id: str,
        api_key: str,
        expires_in: Optional[int] = None,
    ) -> RegisterCommitmentResponse:
        """
        Register a ZKP commitment for an agent.

        Args:
            agent_id: Agent ID
            api_key: API key
            expires_in: Optional TTL in seconds

        Returns:
            RegisterCommitmentResponse with commitment and salt (shown once)
        """
        body: Dict[str, Any] = {"agent_id": agent_id, "api_key": api_key}
        if expires_in is not None:
            body["expires_in"] = expires_in

        data = await self._request(
            "POST",
            "/zkp/register-commitment",
            json=body,
        )
        return RegisterCommitmentResponse(**data)

    async def verify_anonymous(
        self,
        commitment: str,
        mode: str = "zkp",
        proof: Optional[Dict[str, Any]] = None,
        public_signals: Optional[List[str]] = None,
        preimage_hash: Optional[str] = None,
    ) -> VerifyAnonymousResponse:
        """
        Verify a commitment anonymously (ZKP or hash mode).

        Args:
            commitment: The commitment hash
            mode: Verification mode ('zkp' or 'hash')
            proof: Groth16 proof object (for ZKP mode)
            public_signals: Public signals array (for ZKP mode)
            preimage_hash: Preimage hash (for hash mode)

        Returns:
            VerifyAnonymousResponse with validity and permissions
        """
        body: Dict[str, Any] = {"commitment": commitment, "mode": mode}
        if proof is not None:
            body["proof"] = proof
        if public_signals is not None:
            body["publicSignals"] = public_signals
        if preimage_hash is not None:
            body["preimage_hash"] = preimage_hash

        data = await self._request(
            "POST",
            "/zkp/verify-anonymous",
            json=body,
        )
        return VerifyAnonymousResponse(**data)

    # ============================================
    # Anti-Drift Vault
    # ============================================

    async def submit_health_ping(
        self,
        agent_id: str,
        metrics: Dict[str, float],
        request_count: Optional[int] = None,
        period_start: Optional[str] = None,
        period_end: Optional[str] = None,
        signature: Optional[str] = None,
    ) -> HealthPingResponse:
        """
        Submit a health ping with metrics.

        Args:
            agent_id: Agent ID
            metrics: Dict of metric name to value
            request_count: Optional request count for the period
            period_start: Optional ISO date for period start
            period_end: Optional ISO date for period end
            signature: Optional HMAC signature of the ping data

        Returns:
            HealthPingResponse with drift score and status
        """
        body: Dict[str, Any] = {"metrics": metrics}
        if request_count is not None:
            body["request_count"] = request_count
        if period_start is not None:
            body["period_start"] = period_start
        if period_end is not None:
            body["period_end"] = period_end
        if signature is not None:
            body["signature"] = signature

        data = await self._request(
            "POST",
            f"/drift/{agent_id}/health-ping",
            json=body,
            requires_auth=True,
        )
        return HealthPingResponse(**data)

    async def batch_submit_health_pings(
        self,
        agent_id: str,
        pings: List[Dict[str, Any]],
    ) -> List[HealthPingResponse]:
        """
        Submit a batch of health pings.

        Args:
            agent_id: Agent ID
            pings: List of ping data dicts (each with metrics, etc.)

        Returns:
            List of HealthPingResponse for each ping
        """
        results = []
        for ping in pings:
            result = await self.submit_health_ping(
                agent_id=agent_id,
                metrics=ping["metrics"],
                request_count=ping.get("request_count"),
                period_start=ping.get("period_start"),
                period_end=ping.get("period_end"),
                signature=ping.get("signature"),
            )
            results.append(result)
        return results

    async def get_drift_score(self, agent_id: str) -> DriftScoreResponse:
        """
        Get current drift score, thresholds, trend, and spike warnings.

        Args:
            agent_id: Agent ID

        Returns:
            DriftScoreResponse with score and trend data
        """
        data = await self._request(
            "GET",
            f"/drift/{agent_id}/drift-score",
        )
        return DriftScoreResponse(**data)

    async def get_drift_history(
        self,
        agent_id: str,
        limit: int = 20,
        offset: int = 0,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        sort: str = "desc",
        metric: Optional[str] = None,
        format: str = "json",
    ) -> DriftHistoryResponse:
        """
        Get drift history with pagination, date range, and filtering.

        Args:
            agent_id: Agent ID
            limit: Number of entries to return
            offset: Offset for pagination
            from_date: Optional start date (ISO)
            to_date: Optional end date (ISO)
            sort: Sort order ('asc' or 'desc')
            metric: Optional single metric to filter
            format: Output format ('json' or 'csv')

        Returns:
            DriftHistoryResponse with paginated history
        """
        params: Dict[str, Any] = {
            "limit": limit,
            "offset": offset,
            "sort": sort,
            "format": format,
        }
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date
        if metric:
            params["metric"] = metric

        data = await self._request(
            "GET",
            f"/drift/{agent_id}/drift-history",
            params=params,
        )
        return DriftHistoryResponse(**data)

    async def configure_drift(
        self,
        agent_id: str,
        config: Dict[str, Any],
    ) -> DriftConfig:
        """
        Configure drift thresholds, weights, and spike sensitivity.

        Args:
            agent_id: Agent ID
            config: Configuration dict with threshold, weights, etc.

        Returns:
            DriftConfig with updated configuration
        """
        data = await self._request(
            "PUT",
            f"/drift/{agent_id}/drift-config",
            json=config,
            requires_auth=True,
        )
        return DriftConfig(**data)

    async def get_drift_config(self, agent_id: str) -> DriftConfig:
        """
        Get drift configuration for an agent.

        Args:
            agent_id: Agent ID

        Returns:
            DriftConfig for the agent
        """
        data = await self._request(
            "GET",
            f"/drift/{agent_id}/drift-config",
        )
        return DriftConfig(**data)

    async def close(self) -> None:
        """Close the HTTP client"""
        if self._client:
            await self._client.aclose()
            self._client = None
