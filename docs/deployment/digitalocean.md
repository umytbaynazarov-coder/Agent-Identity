# DigitalOcean App Platform Deployment Guide

Deploy AgentAuth to DigitalOcean App Platform with automatic scaling, managed databases, and predictable pricing.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (One-Click Deploy)](#quick-start-one-click-deploy)
3. [Manual Deployment](#manual-deployment)
4. [Environment Variables](#environment-variables)
5. [Managed Database Setup](#managed-database-setup)
6. [Custom Domain Setup](#custom-domain-setup)
7. [Scaling Configuration](#scaling-configuration)
8. [Troubleshooting](#troubleshooting)
9. [Cost Estimate](#cost-estimate)
10. [Updating Your Deployment](#updating-your-deployment)

---

## Prerequisites

- GitHub account
- DigitalOcean account ([digitalocean.com](https://www.digitalocean.com))
  - **$200 free credits** for 60 days (new accounts)
- Supabase project (free - [supabase.com](https://supabase.com))

---

## Quick Start (One-Click Deploy)

Deploy AgentAuth to DigitalOcean in under 10 minutes:

### Step 1: Fork Repository

1. Go to [https://github.com/umyt-dev/Agent-Identity](https://github.com/umyt-dev/Agent-Identity)
2. Click **Fork**
3. Wait for fork to complete

### Step 2: Deploy to DigitalOcean

**Option A: Using App Spec (Recommended)**

1. **Sign in to DigitalOcean**
   - Go to [cloud.digitalocean.com](https://cloud.digitalocean.com)
   - Navigate to "Apps" in left sidebar

2. **Create New App**
   - Click "Create App"
   - Choose "GitHub" as source
   - Authorize DigitalOcean to access your GitHub
   - Select your forked `Agent-Identity` repository
   - Branch: `main`

3. **Use App Spec**
   - DigitalOcean will detect `.do/app.yaml`
   - Or manually upload the spec from `.do/app.yaml`
   - Click "Next"

4. **Configure Environment Variables**

   For the `api` service:

   | Variable | Value | Where to Get |
   |----------|-------|--------------|
   | `SUPABASE_URL` | Your Supabase project URL | [Supabase Dashboard](https://app.supabase.com) → Settings → API |
   | `SUPABASE_KEY` | Your Supabase anon key | Same location |
   | `JWT_SECRET` | Random 32-char string | Run `openssl rand -hex 32` |

   For the `dashboard` service:
   - `VITE_API_BASE_URL` is auto-populated from backend URL

5. **Select Region**
   - Choose closest to your users:
     - NYC (New York)
     - SFO (San Francisco)
     - AMS (Amsterdam)
     - SGP (Singapore)
     - BLR (Bangalore)

6. **Review and Deploy**
   - Instance type: `Basic XXS` ($5/month for backend)
   - Static site: Free
   - Click "Create Resources"
   - Wait 5-10 minutes for deployment

**Option B: Deploy Button (If Available)**

[![Deploy to DO](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/umyt-dev/Agent-Identity/tree/main)

---

## Manual Deployment

If you prefer step-by-step manual setup:

### Deploy Backend

1. **Create App**
   - Go to DigitalOcean Dashboard → Apps
   - Click "Create App"
   - Select GitHub repository: `Agent-Identity`
   - Branch: `main`

2. **Configure Resources**
   - DigitalOcean auto-detects a web service
   - **Name:** `api`
   - **Type:** Web Service
   - **Dockerfile:** `agentauth/Dockerfile`
   - **HTTP Port:** `3000`
   - **HTTP Request Routes:** `/`

3. **Environment Variables**

   Click "Edit" next to environment variables:

   ```
   NODE_ENV=production
   PORT=3000
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_KEY=your_supabase_anon_key
   JWT_SECRET=<run: openssl rand -hex 32>
   FRONTEND_ORIGINS=https://yourdomain.ondigitalocean.app,http://localhost:5173
   ```

   **Mark as encrypted:**
   - `SUPABASE_KEY`
   - `JWT_SECRET`

4. **Instance Size**
   - Basic XXS: $5/month (512MB RAM, 1 vCPU) - Good for starter
   - Basic XS: $12/month (1GB RAM) - Recommended for production

5. **Health Check**
   - Path: `/health`
   - Initial delay: 30 seconds
   - Period: 30 seconds

### Deploy Frontend

1. **Add Component**
   - Click "Add Component" → "Static Site"
   - Source: Same GitHub repo
   - Build command: (auto-detected or leave empty for Docker)
   - Output directory: `/dist` (or use Docker)

   **OR for Docker-based deployment:**
   - Type: Web Service (not Static Site)
   - Dockerfile: `agentauth-dashboard/Dockerfile`
   - HTTP Port: `80`

2. **Environment Variables**
   ```
   VITE_API_BASE_URL=${api.PUBLIC_URL}
   ```

   `${api.PUBLIC_URL}` automatically gets replaced with your backend URL.

3. **Review and Launch**
   - Click "Next" → "Create Resources"
   - Wait for build and deployment

---

## Environment Variables

### Backend (api service)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | ✅ Yes | Environment mode | `production` |
| `PORT` | ✅ Yes | Port the app listens on | `3000` |
| `SUPABASE_URL` | ✅ Yes | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | ✅ Yes | Supabase anon/public key (encrypted) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `JWT_SECRET` | ✅ Yes | Secret for signing JWTs (encrypted, 32+ chars) | Generated via `openssl rand -hex 32` |
| `FRONTEND_ORIGINS` | Recommended | CORS allowed origins | `${APP_DOMAIN},http://localhost:5173` |

**Setting Environment Variables:**
1. Go to your app → Settings → `api` component
2. Click "Environment Variables"
3. Add key-value pairs
4. Check "Encrypt" for secrets (`SUPABASE_KEY`, `JWT_SECRET`)

**Using App-Level Variables:**
- `${APP_DOMAIN}` - Auto-populated with your app's domain
- `${api.PUBLIC_URL}` - Backend public URL

### Frontend (dashboard service)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_BASE_URL` | ✅ Yes | Backend API URL | `${api.PUBLIC_URL}` or `https://api.yourdomain.com` |

**Build-time vs Runtime:**
- `VITE_*` variables are **build-time** (baked into frontend bundle)
- Changes require rebuild (DigitalOcean does this automatically)

---

## Managed Database Setup

DigitalOcean offers managed PostgreSQL databases:

### Option 1: Use Supabase (Recommended)

**Pros:**
- Free tier: 500MB database
- Built-in auth, storage, realtime features
- No code changes needed

**Setup:**
1. Create Supabase project at [supabase.com](https://supabase.com)
2. Get `SUPABASE_URL` and `SUPABASE_KEY` from dashboard
3. Add to DigitalOcean environment variables
4. Done! (AgentAuth is already configured for Supabase)

### Option 2: DigitalOcean Managed Database

**Pros:**
- Integrated with your app
- Automatic backups
- Scaling options

**Cons:**
- Requires code changes (AgentAuth currently uses Supabase client)
- No free tier ($15/month minimum)

**Setup:**

1. **Create Database Cluster**
   - DigitalOcean Dashboard → Databases
   - Click "Create Database Cluster"
   - Engine: PostgreSQL 15
   - Plan: Basic ($15/month for 1GB RAM, 10GB storage)
   - Region: Same as your app
   - Create cluster

2. **Connect to App**
   - Go to your app → Settings → `api` component
   - Scroll to "Resources"
   - Click "Attach Database"
   - Select your database cluster

   DigitalOcean auto-creates environment variable:
   ```
   DATABASE_URL=postgresql://user:pass@host:port/db
   ```

3. **Update Backend Code**
   - Replace Supabase client with standard PostgreSQL client:
   ```javascript
   const { Pool } = require('pg');
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     ssl: { rejectUnauthorized: false }
   });
   ```

4. **Run Migrations**
   - Use DigitalOcean Console or SSH to run:
   ```bash
   npm run migrate
   ```

---

## Custom Domain Setup

DigitalOcean provides free SSL and easy domain management:

### Step 1: Add Domain to DigitalOcean

1. **Add Domain**
   - Go to app → Settings → Domains
   - Click "Add Domain"
   - Enter your domain: `agentauth.yourdomain.com`

2. **Choose Component**
   - Select which component this domain points to:
     - Backend API → `api` component
     - Dashboard → `dashboard` component

### Step 2: Configure DNS

DigitalOcean will provide DNS records:

**For Backend (api.yourdomain.com):**

| Type | Hostname | Value | TTL |
|------|----------|-------|-----|
| CNAME | `api` | `agentauth-abc123.ondigitalocean.app.` | 3600 |

**For Frontend (dashboard.yourdomain.com):**

| Type | Hostname | Value | TTL |
|------|----------|-------|-----|
| CNAME | `dashboard` | `agentauth-abc123.ondigitalocean.app.` | 3600 |

**For Apex Domain (yourdomain.com):**

| Type | Hostname | Value | TTL |
|------|----------|-------|-----|
| A | `@` | `206.189.X.X` | 3600 |
| AAAA | `@` | `2604:a880:...` | 3600 |

### Step 3: Update Environment Variables

1. **Backend:** Update `FRONTEND_ORIGINS`:
   ```
   https://dashboard.yourdomain.com,http://localhost:5173
   ```

2. **Frontend:** Update `VITE_API_BASE_URL`:
   ```
   https://api.yourdomain.com
   ```

3. Save changes (auto-redeploys)

### Step 4: Enable SSL (Automatic)

DigitalOcean automatically provisions SSL certificates via Let's Encrypt:
- Usually takes 5-15 minutes after DNS propagation
- Check status: Settings → Domains (green checkmark = SSL active)

**Test SSL:**
```bash
curl https://api.yourdomain.com/health
# Should return: {"status":"ok"}
```

---

## Scaling Configuration

DigitalOcean App Platform supports automatic scaling:

### Vertical Scaling (Increase Instance Size)

**When to scale up:**
- High CPU usage (>80% consistently)
- High memory usage (>80%)
- Slow response times

**How to scale:**
1. Go to app → Settings → `api` component
2. "Instance Size" → Select larger size:
   - Basic XS: $12/month (1GB RAM)
   - Basic S: $24/month (2GB RAM)
   - Professional: Starting at $40/month (4GB RAM, dedicated CPU)

3. Click "Save" (triggers redeploy)

### Horizontal Scaling (Increase Instance Count)

**When to scale out:**
- High request volume (>1000 req/min)
- Need high availability (99.99% uptime)

**How to scale:**
1. Go to Settings → `api` component
2. "Instance Count" → Increase to 2+ instances
3. DigitalOcean automatically load-balances across instances

**Cost:**
- Each instance costs the same as instance size
- Example: 2x Basic XS = $24/month

### Auto-Scaling (Professional Plans)

**Automatic horizontal scaling based on metrics:**

1. Upgrade to Professional plan
2. Set scaling rules:
   - Min instances: 1
   - Max instances: 5
   - Scale up when CPU >70%
   - Scale down when CPU <30%

**Configuration in `.do/app.yaml`:**
```yaml
services:
  - name: api
    autoscaling:
      min_instance_count: 1
      max_instance_count: 5
      metrics:
        cpu:
          percent: 70
```

---

## Troubleshooting

### Issue: Build Fails

**Error:** `Build failed` in deployment logs

**Solutions:**
1. **Check Build Logs:**
   - Go to app → Activity → Click failed deployment → "Build Logs"
   - Look for errors:
     - `npm install` failures
     - Missing dependencies
     - Dockerfile errors

2. **Common Fixes:**
   - Verify Dockerfile paths in `.do/app.yaml`:
     ```yaml
     dockerfile_path: agentauth/Dockerfile  # Correct
     ```
   - Ensure `package.json` exists in build context
   - Check Node.js version compatibility

---

### Issue: "Application Error" on Frontend

**Error:** Frontend loads but shows errors

**Solution:**
1. **Check `VITE_API_BASE_URL`:**
   - Settings → `dashboard` component → Environment Variables
   - Should be: `${api.PUBLIC_URL}` or `https://api.yourdomain.com`
   - Must include `https://` (not `http://`)

2. **Rebuild Frontend:**
   - Changes to build-time variables require rebuild
   - Click "Force Rebuild and Deploy"

3. **Check Browser Console:**
   - Open DevTools → Console
   - Look for CORS errors or network errors

---

### Issue: Health Check Failing

**Error:** App status shows "Unhealthy"

**Solution:**
1. **Verify `/health` Endpoint:**
   ```bash
   curl https://your-app.ondigitalocean.app/health
   # Should return: {"status":"ok"}
   ```

2. **Check Health Check Settings:**
   - Settings → `api` → Health Check
   - Path: `/health`
   - Initial delay: 30 seconds (increase if app takes long to start)
   - Timeout: 10 seconds

3. **Review Application Logs:**
   - Activity → Runtime Logs
   - Look for startup errors or crashes

---

### Issue: Database Connection Errors

**Error:** `ECONNREFUSED` or `Supabase error`

**Solution:**
1. **Verify Supabase Credentials:**
   - Check `SUPABASE_URL` and `SUPABASE_KEY` are correct
   - Use **anon key** (not service role key)

2. **Test Supabase Connection:**
   ```bash
   curl https://YOUR_SUPABASE_URL/rest/v1/ \
     -H "apikey: YOUR_SUPABASE_KEY"
   ```

3. **Check Supabase Project Status:**
   - Supabase free tier projects pause after 1 week of inactivity
   - Go to Supabase Dashboard → Check project is active

---

### Issue: CORS Errors

**Error:** Browser console shows `CORS policy blocked`

**Solution:**
1. **Update `FRONTEND_ORIGINS`:**
   - Settings → `api` → Environment Variables
   - Add frontend URL (with `https://`):
     ```
     https://your-app.ondigitalocean.app,http://localhost:5173
     ```

2. **Restart Backend:**
   - Click "Force Rebuild and Deploy" on `api` component

---

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` | Can't connect to database | Check `SUPABASE_URL` and network connectivity |
| `JWT malformed` | Invalid `JWT_SECRET` | Regenerate with `openssl rand -hex 32` |
| `CORS blocked` | Frontend URL not allowed | Add to `FRONTEND_ORIGINS` |
| `503 Service Unavailable` | App crashed or health check failing | Check logs and health endpoint |

---

## Cost Estimate

DigitalOcean offers predictable pricing with a generous free trial:

### New Account Benefits
- **$200 free credits** for 60 days
- No credit card required initially

### Pricing (After Free Credits)

**Starter Setup:**

| Component | Plan | Cost |
|-----------|------|------|
| Backend (API) | Basic XXS (512MB RAM, 1 vCPU) | $5/month |
| Frontend (Dashboard) | Static Site | Free |
| Database | Supabase Free Tier | $0/month |
| Bandwidth | 1TB included | Free (overage: $0.01/GB) |
| **Total** | | **$5/month** |

**Production Setup:**

| Component | Plan | Cost |
|-----------|------|------|
| Backend (API) | Basic XS (1GB RAM) | $12/month |
| Frontend (Dashboard) | Static Site | Free |
| Database | Managed PostgreSQL | $15/month |
| Bandwidth | 1TB included | Free |
| **Total** | | **$27/month** |

**Enterprise Setup:**

| Component | Plan | Cost |
|-----------|------|------|
| Backend (API) | Professional (4GB RAM, dedicated CPU) | $40/month |
| Backend (auto-scaling) | +2 instances during peak | +$80/month (peak hours) |
| Frontend | Static Site | Free |
| Database | Managed PostgreSQL (4GB) | $60/month |
| **Total** | | **$100-180/month** (varies with autoscaling) |

### Cost Comparison

| Platform | Starter | Production | Enterprise |
|----------|---------|------------|------------|
| **DigitalOcean** | $5/mo | $27/mo | $100+/mo |
| Railway | $5-10/mo | $20/mo | $50+/mo |
| Render | $7/mo | $27/mo | $80+/mo |
| Heroku | $23/mo | $50/mo | $150+/mo |

**Best for:**
- Predictable pricing (no surprise bills)
- Teams needing managed databases
- Scaling to enterprise workloads

---

## Updating Your Deployment

DigitalOcean supports automatic deployments:

### Enable Auto-Deploy (Default)

Auto-deploy is enabled by default when connected to GitHub.

**How it works:**
1. Push to GitHub (`git push origin main`)
2. DigitalOcean detects the push
3. Automatically builds and deploys
4. Zero-downtime deployment (new version tested before switching)

**Disable auto-deploy:**
- Settings → `api` → "Auto Deploy" → Toggle off

### Manual Deployment

1. Go to your app
2. Click "Create Deployment"
3. Select branch: `main`
4. Click "Deploy"

### Rollback to Previous Version

1. Go to "Activity" tab
2. Find a previous successful deployment
3. Click "⋮" → "Rollback to this deployment"
4. Confirm rollback

**Note:** Rollback is instant (uses cached build)

### Database Migrations

**For Supabase:**
1. Go to Supabase Dashboard → SQL Editor
2. Run migration SQL

**For DigitalOcean Managed Database:**
1. Click "Console" tab in your app
2. Run:
   ```bash
   npm run migrate
   ```

---

## DigitalOcean CLI (Advanced)

For advanced users, DigitalOcean offers `doctl`:

### Install
```bash
# macOS
brew install doctl

# Linux
snap install doctl
```

### Authenticate
```bash
doctl auth init
```

### List Apps
```bash
doctl apps list
```

### View Logs
```bash
doctl apps logs <app-id>
```

### Deploy
```bash
doctl apps create --spec .do/app.yaml
```

### Update App
```bash
doctl apps update <app-id> --spec .do/app.yaml
```

---

## Best Practices

### 1. Use App Spec for Consistency
- Store `.do/app.yaml` in your repo
- Version control all infrastructure changes
- Easier to replicate staging/production environments

### 2. Enable Auto-Deploy for Production
- Faster deployments (no manual clicks)
- Ensure CI/CD tests pass before merging to `main`

### 3. Monitor Resource Usage
- Go to app → Insights
- Watch CPU, memory, bandwidth usage
- Set up alerts for high usage

### 4. Use Managed Databases for Production
- Automatic backups (daily)
- Point-in-time recovery
- High availability (multi-region replication)

### 5. Separate Staging and Production
- Create two apps:
  - `agentauth-staging` (deploys from `develop` branch)
  - `agentauth-production` (deploys from `main` branch)

---

## Next Steps

- [Set up monitoring with DigitalOcean Monitoring](https://www.digitalocean.com/products/monitoring)
- [Configure Uptime Checks](https://www.digitalocean.com/products/uptime)
- [Add CI/CD with GitHub Actions](../cicd.md)
- [Scale your app](https://docs.digitalocean.com/products/app-platform/how-to/scale-app/)

---

## Support

- **DigitalOcean Docs:** [docs.digitalocean.com](https://docs.digitalocean.com)
- **Community:** [digitalocean.com/community](https://www.digitalocean.com/community)
- **AgentAuth Support:** umytbaynazarow754@gmail.com

---

**Last Updated:** January 31, 2026
