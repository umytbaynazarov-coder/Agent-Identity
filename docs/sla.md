# Service Level Agreement (SLA)

**Last Updated:** January 31, 2026
**Version:** 1.0
**Effective Date:** February 1, 2026

---

## Overview

This Service Level Agreement (SLA) outlines AgentAuth's commitment to service availability and performance. We take uptime seriously and are committed to providing a reliable authentication service for your AI agents.

---

## Uptime Commitment

### Target Availability

**99.9% Uptime** - Maximum of 43 minutes of downtime per month

| Period     | Maximum Downtime |
|------------|------------------|
| Monthly    | 43 minutes       |
| Quarterly  | 2.16 hours       |
| Annually   | 8.76 hours       |

### What Counts as Downtime?

Downtime is measured when the AgentAuth API:
- Returns HTTP 5xx errors (excluding rate limits)
- Fails to respond within 30 seconds
- Is unreachable (connection timeout)

### What's Excluded from Downtime?

- **Scheduled Maintenance** (announced 48 hours in advance, max 2 hours/month)
- **Client-side issues** (network problems, invalid requests, rate limiting)
- **Force majeure events** (natural disasters, wars, government actions)
- **Third-party service failures** (Supabase, Railway, DNS providers) - we'll do our best but can't guarantee uptime of external dependencies
- **DDoS attacks or security incidents** requiring service shutdown
- **Beta features** explicitly marked as experimental

---

## Monitoring & Transparency

### Real-Time Status

Monitor our service health at:
- **Status Page:** [agentauths.betteruptime.com](https://agentauths.betteruptime.com/)
- **Health Endpoint:** [https://agentauth-production-b6b2.up.railway.app/health](https://agentauth-production-b6b2.up.railway.app/health)

### What We Monitor

We continuously monitor:
- API response times (target: <100ms p95)
- Database connectivity (checks every 5 minutes)
- Memory usage (alerts at 80% capacity)
- Error rates (alerts at >1% of requests)
- Certificate expiration (auto-renewal 30 days before expiry)

### Notification Channels

During incidents, we update:
1. **Status Page** (real-time updates)
2. **Discord** (#status-updates channel)
3. **Email** (for paid Pro/Enterprise customers)
4. **Incident Log** (post-incident transparency)

---

## Incident Response Process

### Detection → Investigation → Fix → Postmortem

#### 1. Detection (0-5 minutes)
- Automated monitoring alerts engineering team
- Manual reports via support@agentauth.dev or Discord

#### 2. Acknowledgment (5-15 minutes)
- Incident logged in status page
- Initial communication: "We're investigating reports of..."
- Status: Investigating

#### 3. Investigation & Mitigation (15-60 minutes)
- Root cause analysis
- Emergency fixes deployed if possible
- Workarounds communicated to users
- Status updates every 30 minutes during active incidents

#### 4. Resolution (variable)
- Fix deployed and verified
- Monitoring confirms stability
- Status: Resolved
- Communication: "Issue resolved, monitoring for stability"

#### 5. Postmortem (24-48 hours after resolution)
- Public incident report published
- Root cause analysis
- Timeline of events
- What we're changing to prevent recurrence
- Published to [Incident Log](./incidents.md)

### Severity Levels

| Level | Definition | Response Time | Example |
|-------|-----------|---------------|---------|
| **P0 - Critical** | API completely down | <15 min | Database unreachable, 100% error rate |
| **P1 - High** | Major feature broken | <1 hour | Authentication failing for >50% of requests |
| **P2 - Medium** | Degraded performance | <4 hours | Slow response times, intermittent errors |
| **P3 - Low** | Minor issue | <24 hours | Documentation error, UI bug |

---

## Performance Targets

### API Response Times

| Metric | Target | Measured At |
|--------|--------|-------------|
| p50 (median) | <50ms | /v1/agents/verify |
| p95 | <100ms | /v1/agents/verify |
| p99 | <200ms | /v1/agents/verify |

### Database Query Times

| Operation | Target | Notes |
|-----------|--------|-------|
| Agent verification | <20ms | 95th percentile |
| Agent registration | <50ms | Includes JWT generation |
| Webhook delivery | <500ms | Including external HTTP call |

### Rate Limits

Standard rate limits (to ensure fair usage):
- **General API calls:** 100 requests per 15 minutes per IP
- **Authentication endpoints:** 10 requests per 15 minutes per IP

Exceeding rate limits returns HTTP 429 (not counted as downtime).

---

## Self-Hosted vs Managed Service

### Self-Hosted (Free Tier)

**SLA:** None (best-effort)
- You control the infrastructure, uptime, and monitoring
- We provide the open-source software (MIT license)
- Community support via Discord and GitHub Discussions
- No uptime guarantees, but we fix critical bugs ASAP

### Managed Service (Pro & Enterprise)

**SLA:** 99.9% uptime commitment
- We host, monitor, and maintain the infrastructure
- Email support (24-hour response time for Pro, 4-hour for Enterprise)
- Proactive monitoring and alerting
- Automatic scaling and failover
- Security patches applied within 48 hours of disclosure

---

## Reporting Issues

### How to Report an Outage or Incident

1. **Check Status Page First:** [status.agentauth.dev](https://status.agentauth.dev)
   - We may already be aware and working on it

2. **Report via Support Email:** [support@agentauth.dev](mailto:support@agentauth.dev)
   - Include:
     - What's broken? (specific endpoint, error message)
     - When did it start? (timestamp)
     - What's the impact? (how many agents affected?)
     - Request ID (from error response header `X-Request-ID`)

3. **Real-Time Updates:** Join our Discord for live incident updates
   - [Discord Invite Link](#) (add when available)

4. **Emergency Contact (Enterprise only):**
   - Slack Connect channel with on-call engineer

---

## SLA Credits (Managed Service Only)

If we fail to meet our 99.9% uptime commitment in a given month:

| Actual Uptime | Service Credit |
|---------------|----------------|
| 99.0% - 99.9% | 10% of monthly fee |
| 98.0% - 99.0% | 25% of monthly fee |
| 95.0% - 98.0% | 50% of monthly fee |
| Below 95.0%   | 100% of monthly fee |

**How to Claim:**
- Email [billing@agentauth.dev](mailto:billing@agentauth.dev) within 30 days of incident
- Include dates/times of downtime (we verify against our logs)
- Credits applied to next month's invoice (no cash refunds)

**Exclusions:**
- Credits not available for scheduled maintenance
- Credits not available if downtime caused by user error or abuse
- Maximum credit: 100% of one month's fee

---

## Scheduled Maintenance

### Maintenance Windows

- **Frequency:** Monthly (if needed)
- **Duration:** Maximum 2 hours
- **Timing:** Tuesday 2-4 AM PST (lowest traffic period)
- **Advance Notice:** 48 hours via status page, email, Discord

### Emergency Maintenance

For critical security patches or major outages:
- May occur without 48-hour notice
- Announced as soon as possible
- Typically <30 minutes

---

## Contact & Support

| Channel | Response Time | Availability |
|---------|--------------|--------------|
| **Email (support)** | <24 hours | 24/7 (monitored daily) |
| **Discord (community)** | Best-effort | Community-driven |
| **GitHub Issues** | <72 hours | For bugs/features |
| **Emergency (Enterprise)** | <4 hours | 24/7 on-call rotation |

**Support Email:** [support@agentauth.dev](mailto:support@agentauth.dev)
**Security Email:** [security@agentauth.dev](mailto:security@agentauth.dev)
**Billing Email:** [billing@agentauth.dev](mailto:billing@agentauth.dev)

---

## Changes to This SLA

We may update this SLA to reflect:
- Improved service levels (only upward changes)
- New features or services
- Legal or regulatory requirements

**Notice Period:** 30 days for material changes
**Effective Date:** Changes apply to billing periods starting after notice

---

## Legal Disclaimer

This SLA is provided in good faith but does not constitute a legally binding contract for free (self-hosted) tier users. For paid tiers, this SLA is part of your Service Agreement.

**Limitation of Liability:**
AgentAuth's total liability for any SLA breach is limited to the service credits outlined above. We are not liable for indirect damages, lost profits, or consequential damages resulting from service interruptions.

**Open Source Guarantee:**
Even if AgentAuth (the company) ceases operations, the open-source code (MIT licensed) remains available forever. You can fork, self-host, and maintain indefinitely.

---

## Appendix: Historical Uptime

We track and publish our actual uptime monthly:

| Month | Uptime | Downtime | Incidents |
|-------|--------|----------|-----------|
| Feb 2026 | TBD | TBD | TBD |
| Mar 2026 | TBD | TBD | TBD |

Updated monthly at: [Historical Uptime Report](./uptime-history.md)

---

**Questions about this SLA?**
Email us at [support@agentauth.dev](mailto:support@agentauth.dev)

---

*This SLA is effective as of February 1, 2026 and applies to AgentAuth API v0.7.0 and later.*
