"""
Type-safe permission system for AgentAuth SDK

Provides constants and type hints for all service:resource:action permissions.
"""

from typing import Literal, Union

# Type definitions for permissions
Permission = Union[
    # Zendesk
    Literal["zendesk:tickets:read"],
    Literal["zendesk:tickets:write"],
    Literal["zendesk:users:read"],
    Literal["zendesk:users:write"],
    Literal["zendesk:tickets:*"],
    Literal["zendesk:users:*"],
    Literal["zendesk:*:*"],
    # Slack
    Literal["slack:messages:read"],
    Literal["slack:messages:write"],
    Literal["slack:channels:read"],
    Literal["slack:channels:write"],
    Literal["slack:messages:*"],
    Literal["slack:channels:*"],
    Literal["slack:*:*"],
    # HubSpot
    Literal["hubspot:contacts:read"],
    Literal["hubspot:contacts:write"],
    Literal["hubspot:deals:read"],
    Literal["hubspot:deals:write"],
    Literal["hubspot:companies:read"],
    Literal["hubspot:contacts:*"],
    Literal["hubspot:deals:*"],
    Literal["hubspot:companies:*"],
    Literal["hubspot:*:*"],
    # GitHub
    Literal["github:repos:read"],
    Literal["github:repos:write"],
    Literal["github:issues:read"],
    Literal["github:issues:write"],
    Literal["github:pull_requests:read"],
    Literal["github:repos:*"],
    Literal["github:issues:*"],
    Literal["github:pull_requests:*"],
    Literal["github:*:*"],
    # Salesforce
    Literal["salesforce:accounts:read"],
    Literal["salesforce:accounts:write"],
    Literal["salesforce:leads:read"],
    Literal["salesforce:leads:write"],
    Literal["salesforce:accounts:*"],
    Literal["salesforce:leads:*"],
    Literal["salesforce:*:*"],
    # Stripe
    Literal["stripe:payments:read"],
    Literal["stripe:customers:read"],
    Literal["stripe:invoices:read"],
    Literal["stripe:payments:*"],
    Literal["stripe:customers:*"],
    Literal["stripe:invoices:*"],
    Literal["stripe:*:*"],
    # Admin
    Literal["*:*:*"],
]


class _ZendeskTickets:
    """Zendesk Tickets permissions"""

    Read: Permission = "zendesk:tickets:read"
    Write: Permission = "zendesk:tickets:write"
    All: Permission = "zendesk:tickets:*"


class _ZendeskUsers:
    """Zendesk Users permissions"""

    Read: Permission = "zendesk:users:read"
    Write: Permission = "zendesk:users:write"
    All: Permission = "zendesk:users:*"


class _Zendesk:
    """Zendesk service permissions"""

    Tickets = _ZendeskTickets()
    Users = _ZendeskUsers()
    All: Permission = "zendesk:*:*"


class _SlackMessages:
    """Slack Messages permissions"""

    Read: Permission = "slack:messages:read"
    Write: Permission = "slack:messages:write"
    All: Permission = "slack:messages:*"


class _SlackChannels:
    """Slack Channels permissions"""

    Read: Permission = "slack:channels:read"
    Write: Permission = "slack:channels:write"
    All: Permission = "slack:channels:*"


class _Slack:
    """Slack service permissions"""

    Messages = _SlackMessages()
    Channels = _SlackChannels()
    All: Permission = "slack:*:*"


class _HubSpotContacts:
    """HubSpot Contacts permissions"""

    Read: Permission = "hubspot:contacts:read"
    Write: Permission = "hubspot:contacts:write"
    All: Permission = "hubspot:contacts:*"


class _HubSpotDeals:
    """HubSpot Deals permissions"""

    Read: Permission = "hubspot:deals:read"
    Write: Permission = "hubspot:deals:write"
    All: Permission = "hubspot:deals:*"


class _HubSpotCompanies:
    """HubSpot Companies permissions"""

    Read: Permission = "hubspot:companies:read"
    All: Permission = "hubspot:companies:*"


class _HubSpot:
    """HubSpot service permissions"""

    Contacts = _HubSpotContacts()
    Deals = _HubSpotDeals()
    Companies = _HubSpotCompanies()
    All: Permission = "hubspot:*:*"


class _GitHubRepos:
    """GitHub Repositories permissions"""

    Read: Permission = "github:repos:read"
    Write: Permission = "github:repos:write"
    All: Permission = "github:repos:*"


class _GitHubIssues:
    """GitHub Issues permissions"""

    Read: Permission = "github:issues:read"
    Write: Permission = "github:issues:write"
    All: Permission = "github:issues:*"


class _GitHubPullRequests:
    """GitHub Pull Requests permissions"""

    Read: Permission = "github:pull_requests:read"
    All: Permission = "github:pull_requests:*"


class _GitHub:
    """GitHub service permissions"""

    Repos = _GitHubRepos()
    Issues = _GitHubIssues()
    PullRequests = _GitHubPullRequests()
    All: Permission = "github:*:*"


class _SalesforceAccounts:
    """Salesforce Accounts permissions"""

    Read: Permission = "salesforce:accounts:read"
    Write: Permission = "salesforce:accounts:write"
    All: Permission = "salesforce:accounts:*"


class _SalesforceLeads:
    """Salesforce Leads permissions"""

    Read: Permission = "salesforce:leads:read"
    Write: Permission = "salesforce:leads:write"
    All: Permission = "salesforce:leads:*"


class _Salesforce:
    """Salesforce service permissions"""

    Accounts = _SalesforceAccounts()
    Leads = _SalesforceLeads()
    All: Permission = "salesforce:*:*"


class _StripePayments:
    """Stripe Payments permissions"""

    Read: Permission = "stripe:payments:read"


class _StripeCustomers:
    """Stripe Customers permissions"""

    Read: Permission = "stripe:customers:read"


class _StripeInvoices:
    """Stripe Invoices permissions"""

    Read: Permission = "stripe:invoices:read"


class _Stripe:
    """Stripe service permissions (read-only)"""

    Payments = _StripePayments()
    Customers = _StripeCustomers()
    Invoices = _StripeInvoices()
    All: Permission = "stripe:*:*"


class _Permissions:
    """
    Type-safe permission constants for AgentAuth SDK

    Example:
        >>> from agentauth_sdk import Permissions
        >>> permissions = [
        ...     Permissions.Zendesk.Tickets.Read,
        ...     Permissions.Slack.Messages.Write,
        ...     Permissions.Admin,
        ... ]
    """

    Zendesk = _Zendesk()
    Slack = _Slack()
    HubSpot = _HubSpot()
    GitHub = _GitHub()
    Salesforce = _Salesforce()
    Stripe = _Stripe()
    Admin: Permission = "*:*:*"


# Singleton instance
Permissions = _Permissions()
