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

    async def close(self) -> None:
        """Close the HTTP client"""
        if self._client:
            await self._client.aclose()
            self._client = None
