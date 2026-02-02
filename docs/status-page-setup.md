# Status Page Setup Guide

This guide walks you through setting up a public status page for AgentAuth to monitor uptime and communicate incidents to users.

---

## Why a Status Page?

**Builds trust through transparency:**
- Users can check if issues are on your end or theirs
- Reduces support tickets ("Is the API down?")
- Shows you take reliability seriously
- Demonstrates operational maturity

**Three recommended options:**
1. **BetterStack** (recommended - best free tier)
2. **Uptime Robot** (simple, generous free tier)
3. **StatusPage.io** (enterprise-grade, by Atlassian)

---

## Option 1: BetterStack (Recommended)

**Pricing:** Free tier includes 10 monitors, public status page
**Best for:** Startups, open-source projects, most AgentAuth deployments

### Setup Steps

#### 1. Sign Up

1. Go to [betterstack.com](https://betterstack.com)
2. Click "Start Free Trial"
3. Create account with GitHub OAuth (or email)
4. Skip the onboarding wizard (or follow it)

#### 2. Create Monitors

**Monitor 1: Production API Health**

```
Name: AgentAuth API - Production
URL: https://agentauth-production-b6b2.up.railway.app/health
Method: GET
Expected Status: 200
Check Interval: 5 minutes
Timeout: 30 seconds
Regions: Auto (multiple regions)
Incident Threshold: 3 consecutive failures
```

**Response Validation:**
- Check "Verify response body"
- JSON path: `$.status`
- Expected value: `healthy`

**Monitor 2: Dashboard**

```
Name: AgentAuth Dashboard
URL: https://agentauth-dashboard-production.up.railway.app
Method: GET
Expected Status: 200
Check Interval: 5 minutes
Timeout: 30 seconds
```

**Monitor 3: Database Connectivity (via API)**

```
Name: Database Health Check
URL: https://agentauth-production-b6b2.up.railway.app/health/detailed
Method: GET
Expected Status: 200
Check Interval: 10 minutes
Timeout: 30 seconds
```

**Response Validation:**
- JSON path: `$.checks.database.status`
- Expected value: `healthy`

#### 3. Configure Status Page

1. Go to "Status Pages" in sidebar
2. Click "Create Status Page"
3. Configure:

```
Name: AgentAuth Status
Subdomain: agentauth (results in agentauth.betteruptime.com)
Custom Domain: status.agentauth.dev (optional, requires DNS setup)
Logo: Upload AgentAuth logo (PNG, 512x512)
Timezone: Your timezone (PST/UTC)
Theme: Light or Dark
```

4. Add monitors to status page:
   - Check all 3 monitors created above
   - Click "Add to Status Page"

5. Customize appearance:
   - Primary color: #your-brand-color
   - Add header message: "Real-time status for AgentAuth API and services"
   - Footer links: Link to docs, GitHub, Discord

#### 4. Set Up Custom Domain (Optional)

**DNS Configuration:**

Add a CNAME record to your DNS (Cloudflare, Namecheap, etc.):

```
Type: CNAME
Name: status
Value: betteruptime.com
TTL: Auto or 3600
```

Then in BetterStack:
1. Go to Status Page Settings → Custom Domain
2. Enter `status.agentauth.dev`
3. Click "Verify" (may take up to 24 hours)

#### 5. Configure Notifications

**Email Alerts:**
1. Go to "On-call" → "Teams"
2. Add your email: `support@agentauth.dev`
3. Enable notifications for:
   - Incident started
   - Incident resolved
   - Maintenance scheduled

**Discord Webhook:**
1. In Discord, go to Server Settings → Integrations → Webhooks
2. Create webhook for #status-updates channel
3. Copy webhook URL
4. In BetterStack: Integrations → Discord
5. Paste webhook URL
6. Test notification

**Escalation Policy:**
```
1. Send Discord notification (immediately)
2. Send email (after 5 minutes if not acknowledged)
3. Send SMS (after 15 minutes - paid tier only)
```

#### 6. Add Status Badge to README

BetterStack provides a status badge:

```markdown
[![AgentAuth Status](https://betteruptime.com/status-badges/v1/monitor/xxxxx.svg)](https://agentauth.betteruptime.com)
```

Replace `xxxxx` with your monitor ID (found in monitor settings).

---

## Option 2: Uptime Robot

**Pricing:** Free tier includes 50 monitors, 5-minute intervals
**Best for:** Maximum number of monitors, longer data retention

### Setup Steps

#### 1. Sign Up

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Click "Free Sign Up"
3. Create account (email verification required)

#### 2. Create Monitors

**Add Monitor 1: Production API**

```
Monitor Type: HTTP(s)
Friendly Name: AgentAuth API - Production
URL: https://agentauth-production-b6b2.up.railway.app/health
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds
Alert Contacts: Your email
```

**Keyword Monitoring:**
- Enable "Keyword"
- Keyword Type: Exists
- Keyword Value: `"status":"healthy"`

**Add Monitor 2: Dashboard**

```
Monitor Type: HTTP(s)
Friendly Name: AgentAuth Dashboard
URL: https://agentauth-dashboard-production.up.railway.app
Monitoring Interval: 5 minutes
```

**Add Monitor 3: Database Health**

```
Monitor Type: HTTP(s)
Friendly Name: Database Connectivity
URL: https://agentauth-production-b6b2.up.railway.app/health/detailed
Monitoring Interval: 10 minutes
Keyword: "database":{"status":"healthy"
```

#### 3. Create Public Status Page

1. Click "Add Public Status Page"
2. Configure:

```
Page Name: AgentAuth Status
Subdomain: agentauth (results in stats.uptimerobot.com/agentauth)
Custom Domain: status.agentauth.dev (Pro plan only - $7/month)
Monitors: Select all 3 monitors
```

3. Customization (Pro plan):
   - Custom logo
   - Custom colors
   - Hide Uptime Robot branding

**Free tier limitations:**
- No custom domain (use stats.uptimerobot.com/agentauth)
- No logo upload
- Uptime Robot branding visible

#### 4. Set Up Alerts

**Email Alerts:**
1. Go to "My Settings" → "Alert Contacts"
2. Add email: `support@agentauth.dev`
3. Verify email

**Discord Webhook:**
1. Add Alert Contact → Type: Webhook
2. Webhook URL: Your Discord webhook
3. POST format (JSON):

```json
{
  "content": "*monitorFriendlyName* is *monitorAlertType*\nReason: *alertDetails*"
}
```

**Alert Preferences:**
- Notify me when: Down
- Then every: 0 (notify once)
- Also notify me when: Up

#### 5. Status Badge

Uptime Robot provides a shield badge:

```markdown
![AgentAuth Uptime](https://img.shields.io/uptimerobot/ratio/m123456789-1234567890abcdef)
```

Replace monitor ID in the URL (found in monitor settings).

---

## Option 3: StatusPage.io (Atlassian)

**Pricing:** Starts at $29/month (14-day free trial)
**Best for:** Enterprise deployments, maximum customization

### Setup Steps

#### 1. Sign Up

1. Go to [statuspage.io](https://www.atlassian.com/software/statuspage)
2. Click "Start Free Trial"
3. Create Atlassian account

#### 2. Create Status Page

```
Page Name: AgentAuth Status
Subdomain: agentauth.statuspage.io
Custom Domain: status.agentauth.dev (included in all plans)
```

#### 3. Add Components

Components represent different parts of your service:

**Component 1: API**
```
Name: AgentAuth API
Description: Core authentication endpoints (/v1/agents/*)
Display: Always show component status
```

**Component 2: Dashboard**
```
Name: Dashboard
Description: Web interface for managing agents
Display: Always show component status
```

**Component 3: Database**
```
Name: Database
Description: PostgreSQL (Supabase)
Display: Always show component status
```

**Component 4: Webhooks**
```
Name: Webhook Delivery
Description: Event notifications
Display: Always show component status
```

#### 4. Set Up Monitors (External)

StatusPage.io doesn't include uptime monitoring - you need to use:
- **Option A:** Atlassian Statuspage Monitors (basic, included)
- **Option B:** Integrate with external monitoring (recommended)

**Using External Monitors:**

1. Set up monitors in BetterStack or Uptime Robot (free)
2. Use their webhooks to update StatusPage.io components
3. Webhook URL: `https://api.statuspage.io/v1/pages/YOUR_PAGE_ID/incidents`

**StatusPage.io API for automation:**

```bash
# Create incident via API
curl -X POST https://api.statuspage.io/v1/pages/YOUR_PAGE_ID/incidents \
  -H "Authorization: OAuth YOUR_API_KEY" \
  -d '{
    "incident": {
      "name": "API Degradation",
      "status": "investigating",
      "impact": "minor",
      "body": "We are investigating reports of slow API responses.",
      "component_ids": ["API_COMPONENT_ID"]
    }
  }'
```

#### 5. Custom Domain Setup

1. In StatusPage.io: Settings → Domain → Custom Domain
2. Enter: `status.agentauth.dev`
3. Add DNS records:

```
Type: CNAME
Name: status
Value: statuspage-production.statuspage.io
TTL: 3600
```

4. Verify domain (takes 1-24 hours)

#### 6. Email Subscribers

StatusPage.io allows users to subscribe for incident updates:

```
Enable: Public Subscriptions
Collect: Email addresses
Confirmation: Double opt-in
```

Users can subscribe at: `https://status.agentauth.dev/subscribe`

#### 7. Slack Integration

1. Go to Integrations → Slack
2. Connect to your Slack workspace
3. Choose channel: #status-updates
4. Configure notifications:
   - Incident created
   - Incident updated
   - Incident resolved
   - Maintenance scheduled

---

## Comparison Table

| Feature | BetterStack | Uptime Robot | StatusPage.io |
|---------|------------|--------------|---------------|
| **Price (Free Tier)** | Free (10 monitors) | Free (50 monitors) | $29/month (no free tier) |
| **Check Interval** | 3 min (free), 30 sec (paid) | 5 min (free), 1 min (paid) | External monitoring needed |
| **Custom Domain** | Yes (free) | No (paid only) | Yes (included) |
| **Status Page Branding** | Remove in free tier | Visible in free tier | Fully custom |
| **Incident Management** | Basic | Very basic | Advanced |
| **API Access** | Yes | Limited | Full REST API |
| **Integrations** | Many (Discord, Slack, PagerDuty) | Basic (email, webhook) | Extensive (Jira, Slack, PagerDuty) |
| **Best For** | Startups, OSS projects | Maximum monitors on budget | Enterprise, complex infrastructure |

**Recommendation:** Start with **BetterStack** (free, feature-rich). Upgrade to StatusPage.io if you need advanced incident management for Enterprise customers.

---

## Post-Setup Checklist

After setting up your status page:

- [ ] Test monitors by stopping your API temporarily (maintenance mode)
- [ ] Verify notifications are received (email + Discord)
- [ ] Add status badge to README.md
- [ ] Add status page link to website footer
- [ ] Add status page URL to SLA documentation
- [ ] Add status page URL to error responses (API)
- [ ] Create runbook for incident response process
- [ ] Train team on updating status page during incidents
- [ ] Set up weekly uptime reports (for transparency)

---

## Monitoring Best Practices

### What to Monitor

**Critical Endpoints (check every 3-5 minutes):**
- GET /health (uptime check)
- POST /v1/agents/verify (authentication flow)
- GET /v1/agents (list agents)

**Database Health (check every 10 minutes):**
- GET /health/detailed (includes DB connection check)

**Dashboard (check every 5 minutes):**
- GET / (homepage loads)

### What NOT to Monitor

- Authenticated endpoints (avoid sending API keys to monitoring service)
- Rate-limited endpoints (will trigger false alerts)
- Internal/admin endpoints

### Alert Thresholds

Configure monitors to alert after:
- **3 consecutive failures** (avoids false positives from network blips)
- **Timeout: 30 seconds** (allows for slow responses without immediate alert)
- **Re-check interval: 1 minute** (during outage, check more frequently)

### Incident Communication

When an incident occurs:

1. **Update status page within 5 minutes** (even if just "Investigating")
2. **Provide updates every 30 minutes** during active incidents
3. **Post resolution update** when fixed
4. **Publish postmortem within 48 hours** (see [incidents.md](./incidents.md))

---

## Status Page Content Tips

### Good Incident Update ✅

```
15:45 UTC - Investigating
We're seeing elevated error rates (~30%) on authentication endpoints.
Investigating the root cause. Dashboard and webhook delivery unaffected.
```

### Bad Incident Update ❌

```
We're looking into it.
```

**Be specific:**
- What's broken?
- What's NOT broken?
- What are you doing about it?
- When will you update next?

---

## Automating Status Updates

### Option 1: API Integration

Update status page automatically from your monitoring:

```javascript
// Example: Update BetterStack incident via API
const updateIncident = async (incidentId, message) => {
  await fetch(`https://uptime.betterstack.com/api/v2/incidents/${incidentId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.BETTERSTACK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      summary: message,
      status: 'investigating'
    })
  });
};
```

### Option 2: Webhook Integration

Configure your error tracking (Sentry) to create status page incidents:

```javascript
// In your error handler
if (errorRate > 10%) {
  // Create incident on status page
  await fetch(process.env.STATUS_PAGE_WEBHOOK, {
    method: 'POST',
    body: JSON.stringify({
      title: 'High Error Rate Detected',
      description: `Error rate: ${errorRate}%`,
      severity: 'high'
    })
  });
}
```

---

## Maintenance Mode

Schedule maintenance windows (for deployments):

1. **Announce 48 hours in advance**
2. **Schedule for low-traffic time** (Tuesday 2-4 AM PST)
3. **Duration: <2 hours**
4. **Update status page** with maintenance schedule

**Example Maintenance Announcement:**

```
Scheduled Maintenance: Tuesday, Feb 10, 2:00-4:00 AM PST

We'll be deploying v0.7.0 with performance improvements.
Expect brief API downtime (~5 minutes).
Dashboard will remain accessible (read-only mode).

What's changing:
- Database migration (adds indexes for faster queries)
- New caching layer (reduces API latency by 30%)
- Security patches

Questions? Email support@agentauth.dev
```

---

## Related Documentation

- [SLA (Service Level Agreement)](./sla.md) - Our uptime commitment
- [Incident Log](./incidents.md) - Historical incident reports
- [Deployment Guides](./deployment/) - How to deploy with high availability

---

## Next Steps

1. **Choose a monitoring service** (BetterStack recommended)
2. **Set up 3-5 monitors** (API, dashboard, database)
3. **Configure notifications** (email + Discord)
4. **Add status badge to README**
5. **Document your status page URL** in SLA and error messages
6. **Test your setup** by triggering a fake incident

**Estimated setup time:** 1-2 hours

---

**Questions?**
Open a GitHub Discussion or email [support@agentauth.dev](mailto:support@agentauth.dev)

---

*Last Updated: January 31, 2026*
