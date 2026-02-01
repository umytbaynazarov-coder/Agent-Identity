# Incident Log

**Public Transparency Report**

This page documents all notable service incidents affecting AgentAuth users. We believe in radical transparency - every outage, degradation, and major bug is documented here with full root cause analysis.

---

## Why We Publish Incidents

**Trust through transparency.** When things break (and they will), we:
1. Acknowledge it publicly
2. Explain what happened
3. Share what we're doing to prevent it
4. Learn and improve

Every incident makes us better.

---

## Incident Report Template

Each incident follows this format:

### Incident #[NUMBER]: [BRIEF TITLE]

**Date:** YYYY-MM-DD
**Duration:** HH:MM (start time - end time UTC)
**Severity:** [P0-Critical | P1-High | P2-Medium | P3-Low]
**Status:** [Investigating | Identified | Monitoring | Resolved]

#### Impact
- **Affected Services:** [API, Dashboard, Webhooks, etc.]
- **User Impact:** [Description of what users experienced]
- **Scope:** [% of users affected, geographic regions, specific features]
- **Downtime:** [Total minutes of service unavailability]

#### Timeline (UTC)

| Time | Event |
|------|-------|
| HH:MM | [Incident began - first indication] |
| HH:MM | [Detection/alerting triggered] |
| HH:MM | [Team notified, investigation started] |
| HH:MM | [Root cause identified] |
| HH:MM | [Fix deployed] |
| HH:MM | [Service restored, monitoring] |
| HH:MM | [Incident closed] |

#### Root Cause

[Detailed technical explanation of what went wrong]

**Why it happened:**
- [Underlying cause]
- [Contributing factors]
- [How it bypassed our safeguards]

#### Resolution

[What we did to fix it]

**Immediate Actions:**
- [Emergency fixes deployed during incident]

**Long-term Fixes:**
- [Permanent fixes to prevent recurrence]

#### Prevention

[What we're changing to prevent this from happening again]

**Technical Changes:**
- [ ] [Action item 1]
- [ ] [Action item 2]
- [ ] [Action item 3]

**Process Changes:**
- [ ] [Process improvement 1]
- [ ] [Process improvement 2]

**Monitoring Improvements:**
- [ ] [New alert/monitoring]
- [ ] [Earlier detection mechanism]

#### Lessons Learned

**What Went Well:**
- [Things that worked during incident response]

**What Went Wrong:**
- [Things that didn't work or made it worse]

**What We Learned:**
- [Key takeaways for the team]

---

## Recent Incidents

> As of February 2026, we haven't had any production incidents yet (we just launched!). When incidents occur, they'll be documented here chronologically.

When we have our first incident, it will appear below:

---

<!-- Template for first real incident - REMOVE THIS COMMENT when adding real incident

### Incident #001: [Title]

**Date:** YYYY-MM-DD
**Duration:** HH:MM
**Severity:** [Level]
**Status:** Resolved

[Follow template above]

---

-->

## Incident Statistics

| Month | Total Incidents | P0/P1 Incidents | Total Downtime | Uptime % |
|-------|----------------|-----------------|----------------|----------|
| Feb 2026 | 0 | 0 | 0 min | 100% |
| Mar 2026 | - | - | - | - |

**Target:** 99.9% uptime (max 43 min downtime/month)

---

## Example Incident Report (Template Walkthrough)

Below is a **fictional example** to show how we'll document real incidents:

---

### Incident #000: Example - Database Connection Pool Exhaustion

**Date:** 2026-01-15
**Duration:** 14:32 - 15:17 UTC (45 minutes)
**Severity:** P0-Critical
**Status:** Resolved

#### Impact
- **Affected Services:** All API endpoints (authentication, registration, webhooks)
- **User Impact:** Users received HTTP 500 errors when attempting to authenticate agents
- **Scope:** 100% of requests failed during peak (14:45-15:00), ~5,000 failed authentication attempts
- **Downtime:** 45 minutes total (15 minutes complete outage, 30 minutes degraded)

#### Timeline (UTC)

| Time | Event |
|------|-------|
| 14:32 | Spike in traffic from new customer onboarding 500 agents |
| 14:35 | Error rate climbs to 10% (automated alert triggered) |
| 14:37 | On-call engineer paged via PagerDuty |
| 14:42 | Investigation begins - reviewing logs and metrics |
| 14:45 | 100% error rate - complete API outage |
| 14:50 | Root cause identified: database connection pool exhausted |
| 14:55 | Emergency fix deployed: increased max_connections from 20 to 100 |
| 15:00 | API recovering, error rate drops to 5% |
| 15:10 | Error rate stabilized at <1% |
| 15:17 | Incident closed, monitoring continues |

#### Root Cause

The database connection pool was configured with `max: 20` connections. During normal operation, this was sufficient. However, when a new customer onboarded 500 agents simultaneously:

1. Each authentication request held a database connection for ~200ms
2. With 50 requests/second, we needed 10 concurrent connections minimum
3. A slow query (unoptimized webhook lookup) took 3 seconds instead of 200ms
4. This caused connection buildup: 50 req/sec * 3 sec = 150 connections needed
5. With only 20 available, requests queued → timeout → error

**Why it happened:**
- Connection pool too small for production load
- No connection timeout configured (connections held indefinitely)
- Slow webhook query not caught in testing (only 2 webhooks in test DB)

**How it bypassed our safeguards:**
- Load testing only simulated 10 req/sec (real traffic was 50 req/sec during spike)
- No alerting on connection pool utilization (only error rate)

#### Resolution

**Immediate Actions:**
1. Increased connection pool from 20 → 100 connections
2. Added connection timeout (30 seconds)
3. Restarted API servers to clear stuck connections

**Long-term Fixes:**
1. Optimized webhook query (added index on `agent_id` column) - reduced from 3s to 50ms
2. Implemented connection pool monitoring with alerts at 80% utilization
3. Added circuit breaker pattern to prevent cascade failures

#### Prevention

**Technical Changes:**
- [x] Increase connection pool to 100 (deployed 2026-01-15)
- [x] Add database index on `webhooks.agent_id` (deployed 2026-01-16)
- [x] Implement connection pool metrics in Grafana (deployed 2026-01-17)
- [ ] Add query timeout enforcement (15 seconds max) - ETA: 2026-01-22
- [ ] Implement rate limiting on agent registration (max 100/min per customer) - ETA: 2026-01-25

**Process Changes:**
- [x] Load testing now simulates 100 req/sec (10x normal traffic)
- [x] Added "connection pool utilization" to pre-deployment checklist
- [ ] Weekly review of slow query log (>100ms queries) - starts 2026-01-22

**Monitoring Improvements:**
- [x] Alert when connection pool >80% utilized (deployed 2026-01-16)
- [x] Alert when average query time >200ms (deployed 2026-01-16)
- [ ] Dashboard showing connection pool health in real-time - ETA: 2026-01-20

#### Lessons Learned

**What Went Well:**
- Automated alerting detected the issue within 3 minutes
- On-call engineer responded within 5 minutes
- Root cause identified quickly using structured logs
- Fix deployed in 18 minutes from identification

**What Went Wrong:**
- Load testing didn't catch this (insufficient scale testing)
- No proactive monitoring of connection pool (only reactive via errors)
- Customer onboarding didn't have rate limits (allowed 500 simultaneous requests)

**What We Learned:**
- Always test at 10x expected load, not 2x
- Monitor resource utilization (connections, memory, CPU), not just errors
- Every resource needs limits: connections, requests, concurrent jobs
- Query performance degrades non-linearly with data size (worked fine with 2 webhooks, failed with 2,000)

---

## How to Report an Incident

If you experience an outage or service degradation:

1. **Check this page first** - we may already be working on it
2. **Check the status page:** [status.agentauth.dev](#)
3. **Report via email:** [support@agentauth.dev](mailto:support@agentauth.dev)
4. **Real-time updates:** Join our Discord (#status channel)

**Include in your report:**
- What's broken? (specific API endpoint, error message)
- When did it start? (timestamp with timezone)
- What's the impact? (how many agents affected?)
- Request ID (from error response header `X-Request-ID`)

---

## Incident Severity Definitions

| Level | Response Time | Definition |
|-------|--------------|------------|
| **P0 - Critical** | <15 min | API completely down, 100% error rate, data loss risk |
| **P1 - High** | <1 hour | Major feature broken, >50% error rate, security breach |
| **P2 - Medium** | <4 hours | Degraded performance, <10% errors, slow responses |
| **P3 - Low** | <24 hours | Minor bugs, UI issues, documentation errors |

---

## Related Documents

- [Service Level Agreement (SLA)](./sla.md) - Our uptime commitment
- [Status Page](https://status.agentauth.dev) - Real-time service status
- [Deployment Documentation](./deployment/) - How to self-host with 99.9% uptime

---

**Last Updated:** January 31, 2026

*We'll update this page within 24-48 hours of every incident with full root cause analysis.*
