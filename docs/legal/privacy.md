# Privacy Policy

**Last Updated:** January 31, 2026

## Introduction

This Privacy Policy explains how AgentAuth ("we," "us," or "our") collects, uses, and protects your information when you use our authentication service for AI agents.

**Key Points:**
- **Self-hosted users:** We collect NO data - you control everything
- **Managed hosting users:** We only collect what's necessary to operate the service
- **We don't sell your data** - ever
- **You own your data** - not us

## Table of Contents

1. [What We Collect](#what-we-collect)
2. [What We DON'T Collect](#what-we-dont-collect)
3. [How We Use Your Information](#how-we-use-your-information)
4. [Data Storage and Security](#data-storage-and-security)
5. [Data Retention](#data-retention)
6. [Your Rights (GDPR & CCPA)](#your-rights-gdpr--ccpa)
7. [Cookies and Tracking](#cookies-and-tracking)
8. [Third-Party Services](#third-party-services)
9. [Children's Privacy](#childrens-privacy)
10. [Changes to This Policy](#changes-to-this-policy)
11. [Contact Us](#contact-us)

---

## What We Collect

### Self-Hosted Users

**We collect NOTHING.**

When you self-host AgentAuth:
- All data stays on your infrastructure
- We have no access to your database
- We don't collect analytics, logs, or telemetry
- You are the sole data controller

### Managed Hosting Users

When you use our managed hosting service, we collect:

#### 1. Account Information
- Email address
- Company name (optional)
- Password (hashed with bcrypt - we never see plaintext)
- Billing information (processed by Stripe - we don't store credit cards)

#### 2. Agent Data
- Agent names and descriptions
- API keys (hashed with SHA-256 - we never see plaintext)
- Permission scopes assigned to agents
- Agent registration timestamps

#### 3. Authentication Logs
- Authentication attempts (success/failure)
- IP addresses (for security and rate limiting)
- Timestamps
- User agents
- Request IDs

#### 4. Webhook Data
- Webhook URLs you configure
- Webhook event types you subscribe to
- Webhook delivery logs (success/failure)

#### 5. Technical Data
- Server logs (errors, warnings, info)
- Performance metrics (response times, uptime)
- Database query logs (for optimization)

---

## What We DON'T Collect

We explicitly do NOT collect:

❌ **Website analytics** - No Google Analytics, no tracking pixels (unless you opt-in)
❌ **Behavior tracking** - We don't track how you use the dashboard
❌ **Third-party tracking** - No Facebook Pixel, no ad networks
❌ **Location data** - We only log IP addresses for security
❌ **Personal messages** - We don't read your agent's messages or data
❌ **Biometric data** - We don't collect fingerprints, face scans, etc.
❌ **Financial data** - Credit cards are handled by Stripe, not us

---

## How We Use Your Information

We use your information ONLY to:

### 1. Provide the Service
- Authenticate your agents
- Enforce rate limits
- Deliver webhooks
- Display your dashboard

### 2. Improve the Service
- Fix bugs and errors
- Optimize performance
- Monitor uptime and reliability

### 3. Communicate with You
- Send service updates and security alerts
- Respond to your support requests
- Send billing notifications (for paid plans)

### 4. Ensure Security
- Detect and prevent fraud
- Prevent abuse and spam
- Respond to security incidents

### 5. Legal Compliance
- Comply with legal obligations
- Enforce our Terms of Service
- Respond to lawful requests from authorities

**We do NOT:**
- Sell your data to third parties
- Use your data for advertising
- Share your data with data brokers
- Train AI models on your data

---

## Data Storage and Security

### Storage Location

- **Self-hosted:** Your infrastructure, your location
- **Managed hosting:** Data stored on secure cloud servers (Railway/Render) in [Region: US/EU]

### Security Measures

We implement industry-standard security practices:

✅ **Encryption:**
- HTTPS/TLS for all data in transit
- Encrypted database connections
- Password hashing with bcrypt (12+ rounds)
- API key hashing with SHA-256

✅ **Access Control:**
- Role-based access control (RBAC)
- Least privilege principle
- Two-factor authentication available
- Audit logs for admin actions

✅ **Infrastructure:**
- Regular security updates
- Firewall protection
- DDoS mitigation
- Automated backups (encrypted)

✅ **Monitoring:**
- 24/7 uptime monitoring
- Security alert system
- Intrusion detection
- Log analysis for anomalies

**No system is 100% secure.** While we implement best practices, you use the Service at your own risk (see Terms of Service).

---

## Data Retention

### Self-Hosted

You control all retention policies on your infrastructure.

### Managed Hosting

We retain data as follows:

| Data Type | Retention Period |
|-----------|------------------|
| Account information | Until account deletion |
| Agent data | Until agent deletion or account deletion |
| Authentication logs | 30 days (configurable: 7-90 days) |
| Webhook logs | 30 days |
| Error logs | 30 days |
| Billing records | 7 years (legal requirement) |
| Backups | 30 days (rolling backups) |

**Log Rotation:** Logs older than the retention period are automatically deleted.

**Account Deletion:** When you delete your account:
- All agent data is deleted within 24 hours
- Logs are deleted within 30 days
- Backups are purged within 30 days
- Billing records are retained for 7 years (legal requirement)

---

## Your Rights (GDPR & CCPA)

If you're in the EU (GDPR) or California (CCPA), you have the following rights:

### 1. Right to Access
Request a copy of all data we have about you.

### 2. Right to Rectification
Request corrections to inaccurate data.

### 3. Right to Erasure ("Right to be Forgotten")
Request deletion of your data.

### 4. Right to Data Portability
Request your data in a machine-readable format (JSON/CSV).

### 5. Right to Restrict Processing
Request we limit how we use your data.

### 6. Right to Object
Object to specific data processing activities.

### 7. Right to Withdraw Consent
Withdraw consent for data processing at any time.

### 8. Right to Complain
File a complaint with your data protection authority.

**How to Exercise Your Rights:**

Email **umytbaynazarow754@gmail.com** with:
- Your account email
- The right you wish to exercise
- Any supporting details

We will respond within **30 days** (as required by GDPR).

---

## Cookies and Tracking

### Self-Hosted

We don't set any cookies on self-hosted instances (unless you configure analytics yourself).

### Managed Hosting

We use minimal cookies:

#### Essential Cookies (Required)

| Cookie Name | Purpose | Duration |
|-------------|---------|----------|
| `session` | Keep you logged in | 7 days |
| `csrf_token` | Prevent CSRF attacks | Session |

#### Optional Cookies (Opt-In Only)

| Cookie Name | Purpose | Duration |
|-------------|---------|----------|
| `analytics` | Anonymous usage stats | 1 year |

**You can disable optional cookies** in your dashboard settings.

**We do NOT use:**
- Third-party advertising cookies
- Social media tracking cookies
- Cross-site tracking cookies

---

## Third-Party Services

AgentAuth uses the following third-party services:

### For All Users

| Service | Purpose | Privacy Policy |
|---------|---------|----------------|
| Supabase | Database hosting | [Supabase Privacy](https://supabase.com/privacy) |
| Railway/Render | Server hosting | [Railway Privacy](https://railway.app/legal/privacy) |

### For Managed Hosting Users

| Service | Purpose | Privacy Policy |
|---------|---------|----------------|
| Stripe | Payment processing | [Stripe Privacy](https://stripe.com/privacy) |
| Sentry | Error monitoring | [Sentry Privacy](https://sentry.io/privacy/) |

**Note:** These third parties have their own privacy policies. We recommend reviewing them.

**Data Sharing:** We only share the minimum data necessary for these services to function (e.g., Stripe needs your email for billing).

---

## Children's Privacy

AgentAuth is not intended for users under 18 years old. We do not knowingly collect data from children.

If you believe a child has provided us with personal information, contact **umytbaynazarow754@gmail.com** and we will delete it immediately.

---

## Changes to This Policy

We may update this Privacy Policy from time to time. When we do:

- We'll update the "Last Updated" date at the top
- Material changes will be notified via email (for managed hosting users)
- Changes will be posted on our website and GitHub
- You'll have 30 days to review before changes take effect

Continued use after changes take effect means you accept the new policy.

---

## Contact Us

For privacy-related questions or requests:

- **Email:** umytbaynazarow754@gmail.com
- **Support:** umytbaynazarow754@gmail.com
- **Website:** https://agentauth.dev
- **Mail:** [Your Company Address] (if required by jurisdiction)

**Response Time:** We aim to respond within 48 hours for privacy requests, and within 30 days for GDPR/CCPA data requests.

---

## Summary (Not Legal Advice)

This is a plain-English summary. The full Privacy Policy above is the legally binding document.

**Self-Hosted Users:**
- ✅ We collect ZERO data
- ✅ You control everything
- ✅ Your infrastructure, your rules

**Managed Hosting Users:**
- ✅ We only collect what's necessary to run the service
- ✅ We don't sell or share your data
- ✅ You can export or delete your data anytime
- ✅ GDPR & CCPA compliant

**For Everyone:**
- ✅ No tracking or analytics (by default)
- ✅ No third-party ads
- ✅ Industry-standard security
- ✅ Transparent data practices

**Questions?** Email umytbaynazarow754@gmail.com

---

**Compliance Notes:**

This Privacy Policy is designed to comply with:
- **GDPR** (EU General Data Protection Regulation)
- **CCPA** (California Consumer Privacy Act)
- **Standard privacy best practices**

**Before launching a paid service, we recommend:**
1. Consulting with a privacy lawyer
2. Registering with relevant data protection authorities
3. Implementing a Data Protection Impact Assessment (DPIA)
4. Setting up a Data Processing Agreement (DPA) for enterprise customers

**Privacy Review Services:**
- **TrustArc** (~$500-1000 for policy review)
- **Termly** (~$200-500 for automated compliance)
- **Privacy attorney** (~$200-400/hour for custom review)
