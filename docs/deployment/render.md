# Render Deployment Guide

Deploy AgentAuth to Render with one-click deployment using our Blueprint configuration. Render offers a generous free tier for static sites and affordable pricing for backend services.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [One-Click Deployment](#one-click-deployment)
3. [Manual Deployment](#manual-deployment)
4. [Environment Variables](#environment-variables)
5. [Custom Domain Setup](#custom-domain-setup)
6. [Database Configuration](#database-configuration)
7. [Health Checks](#health-checks)
8. [Troubleshooting](#troubleshooting)
9. [Cost Estimate](#cost-estimate)
10. [Updating Your Deployment](#updating-your-deployment)

---

## Prerequisites

- GitHub account
- Render account (free - sign up at [render.com](https://render.com))
- Supabase project (free - [supabase.com](https://supabase.com))

---

## One-Click Deployment

The fastest way to deploy AgentAuth to Render:

### Step 1: Deploy Using Blueprint

1. **Fork the Repository**
   - Go to [https://github.com/umyt-dev/Agent-Identity](https://github.com/umyt-dev/Agent-Identity)
   - Click **Fork**

2. **Deploy to Render**
   - Click the button below (or create one for your repo):

   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

   Or manually:
   - Go to [render.com/dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub account
   - Select your forked `Agent-Identity` repository
   - Render will detect `render.yaml` automatically

3. **Configure Environment Variables**

   Render will prompt you to set these variables:

   | Variable | Value | Where to Get |
   |----------|-------|--------------|
   | `SUPABASE_URL` | Your Supabase project URL | [Supabase Dashboard](https://app.supabase.com) → Settings → API |
   | `SUPABASE_KEY` | Your Supabase anon key | Same location as above |
   | `JWT_SECRET` | Auto-generated (or use your own) | Render auto-generates or run `openssl rand -hex 32` |

4. **Deploy**
   - Click "Apply"
   - Render will create 2 services:
     - `agentauth-api` (backend)
     - `agentauth-dashboard` (frontend)
   - Wait 5-10 minutes for initial build

5. **Update Frontend URL**
   - After backend deploys, copy its URL (e.g., `https://agentauth-api.onrender.com`)
   - Go to `agentauth-dashboard` service → Environment
   - Update `VITE_API_BASE_URL` with backend URL
   - Click "Save Changes" (will trigger redeploy)

6. **Update CORS**
   - Copy frontend URL (e.g., `https://agentauth-dashboard.onrender.com`)
   - Go to `agentauth-api` service → Environment
   - Update `FRONTEND_ORIGINS`: `https://agentauth-dashboard.onrender.com,http://localhost:5173`
   - Click "Save Changes"

**🎉 Done! Your AgentAuth is live!**

---

## Manual Deployment

If you prefer manual setup (or don't want to use Blueprint):

### Deploy Backend

1. **Create Web Service**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect GitHub and select `Agent-Identity` repository

2. **Configure Service**
   - **Name:** `agentauth-api`
   - **Runtime:** Docker
   - **Dockerfile Path:** `./agentauth/Dockerfile`
   - **Docker Context:** `./agentauth`
   - **Instance Type:** Free (or Starter $7/month for production)

3. **Advanced Settings**
   - **Health Check Path:** `/health`
   - **Auto-Deploy:** Yes (deploys on git push)

4. **Environment Variables**

   Add these in "Environment" tab:

   ```
   NODE_ENV=production
   PORT=3000
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_KEY=your_supabase_anon_key
   JWT_SECRET=<generate with: openssl rand -hex 32>
   FRONTEND_ORIGINS=https://yourdashboard.onrender.com,http://localhost:5173
   ```

5. **Create Service**
   - Click "Create Web Service"
   - Wait 5-10 minutes for build

### Deploy Frontend

1. **Create Static Site**
   - Click "New" → "Static Site"
   - Select `Agent-Identity` repository

2. **Configure**
   - **Name:** `agentauth-dashboard`
   - **Branch:** `main`
   - **Build Command:** `cd agentauth-dashboard && npm install && npm run build`
   - **Publish Directory:** `agentauth-dashboard/dist`

   **OR** use Docker (recommended for consistency):
   - **Runtime:** Docker
   - **Dockerfile Path:** `./agentauth-dashboard/Dockerfile`
   - **Docker Context:** `./agentauth-dashboard`

3. **Environment Variables**
   ```
   VITE_API_BASE_URL=https://agentauth-api.onrender.com
   ```

4. **Create**
   - Click "Create Static Site" (or "Create Web Service" if using Docker)
   - Frontend will build and deploy

---

## Environment Variables

### Backend (agentauth-api)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | ✅ Yes | Environment mode | `production` |
| `PORT` | Auto-set | Render sets this automatically | `3000` (Render overrides) |
| `SUPABASE_URL` | ✅ Yes | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | ✅ Yes | Supabase anon/public key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `JWT_SECRET` | ✅ Yes | Secret for signing JWTs (32+ chars) | Use Render's "Generate" button or `openssl rand -hex 32` |
| `FRONTEND_ORIGINS` | Recommended | CORS allowed origins (comma-separated) | `https://yourdashboard.onrender.com,http://localhost:5173` |

**How to Set Variables:**
1. Go to your service in Render
2. Click "Environment" in left sidebar
3. Click "Add Environment Variable"
4. Enter key and value
5. Click "Save Changes" (triggers redeploy)

### Frontend (agentauth-dashboard)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_BASE_URL` | ✅ Yes | Backend API URL | `https://agentauth-api.onrender.com` |

**Important:** For Docker builds, set this as a **build-time** environment variable:
- Go to service → Environment → Click "Add Environment Variable"
- The Dockerfile already handles this with `ARG VITE_API_BASE_URL`

---

## Custom Domain Setup

Render makes custom domains simple and includes free SSL:

### Step 1: Add Custom Domain

1. Go to your service (backend or frontend)
2. Click "Settings" → scroll to "Custom Domains"
3. Click "Add Custom Domain"
4. Enter your domain:
   - Backend: `api.yourdomain.com`
   - Frontend: `dashboard.yourdomain.com` or `agentauth.yourdomain.com`

### Step 2: Configure DNS

Render will provide DNS records. Add them to your DNS provider:

**For Backend (api.yourdomain.com):**

| Type | Name | Value |
|------|------|-------|
| CNAME | `api` | `agentauth-api.onrender.com` |

**For Frontend (dashboard.yourdomain.com):**

| Type | Name | Value |
|------|------|-------|
| CNAME | `dashboard` | `agentauth-dashboard.onrender.com` |

**For Apex Domain (yourdomain.com):**

Render provides A records if you want to use the apex domain:

| Type | Name | Value |
|------|------|-------|
| A | `@` | `216.24.57.1` |
| A | `@` | `216.24.57.2` |

### Step 3: Update Environment Variables

After adding custom domains:

1. **Backend:** Update `FRONTEND_ORIGINS`:
   ```
   https://dashboard.yourdomain.com,http://localhost:5173
   ```

2. **Frontend:** Update `VITE_API_BASE_URL`:
   ```
   https://api.yourdomain.com
   ```

3. Save changes (will trigger redeployments)

### Step 4: Verify SSL

Render automatically provisions SSL certificates via Let's Encrypt (usually 5-15 minutes after DNS propagation).

**Check status:**
- Go to service → Settings → Custom Domains
- Look for green checkmark next to your domain

**Test HTTPS:**
```bash
curl https://api.yourdomain.com/health
# Should return: {"status":"ok"}
```

---

## Database Configuration

AgentAuth uses Supabase PostgreSQL:

### Using Supabase (Recommended)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose a name and strong password

2. **Get Credentials**
   - Go to Project Settings → API
   - Copy:
     - `URL` → Use as `SUPABASE_URL`
     - `anon public` key → Use as `SUPABASE_KEY`

3. **Add to Render**
   - Go to your backend service → Environment
   - Add `SUPABASE_URL` and `SUPABASE_KEY`
   - Save (triggers redeploy)

### Using Render PostgreSQL (Alternative)

If you prefer Render-managed database:

1. **Create PostgreSQL Database**
   - In Render Dashboard, click "New" → "PostgreSQL"
   - Choose a name and region
   - Select instance type:
     - Free: 90-day trial, then expires
     - Starter: $7/month, 256MB RAM
     - Standard: $20/month, 1GB RAM

2. **Connect to Backend**
   - Render auto-creates `DATABASE_URL` environment variable
   - Update your backend code to use `DATABASE_URL` instead of Supabase client

**Note:** Current AgentAuth backend is built for Supabase. Using Render PostgreSQL requires code changes.

---

## Health Checks

Render uses health checks to monitor service availability:

### Backend Health Check

Already configured in `render.yaml`:
```yaml
healthCheckPath: /health
```

**How it works:**
- Render pings `/health` every 30 seconds
- If it returns non-200 status, Render marks service as unhealthy
- After 3 failed checks, Render restarts the service

**Test your health endpoint:**
```bash
curl https://your-backend.onrender.com/health
# Should return: {"status":"ok"}
```

### Frontend Health Check

For static sites, Render checks if the site loads (HTTP 200 on root path).

For Docker-based frontend (recommended), add health check to `render.yaml`:
```yaml
healthCheckPath: /
```

---

## Troubleshooting

### Issue: Build Fails with "Dockerfile not found"

**Error:** `ERROR: Dockerfile not found in build context`

**Solution:**
1. Verify `dockerfilePath` and `dockerContext` in `render.yaml`:
   ```yaml
   dockerfilePath: ./agentauth/Dockerfile  # Path from repo root
   dockerContext: ./agentauth              # Build context directory
   ```

2. Or in Render Dashboard:
   - Settings → "Dockerfile Path": `./agentauth/Dockerfile`
   - Settings → "Docker Context": `./agentauth`

---

### Issue: Frontend Shows "Network Error"

**Error:** Dashboard loads but API calls fail

**Solution:**
1. **Check `VITE_API_BASE_URL`:**
   - Go to frontend service → Environment
   - Ensure it matches your backend URL (include `https://`)
   - Should NOT end with `/`

2. **Rebuild Frontend:**
   - The environment variable is baked into the build
   - After changing `VITE_API_BASE_URL`, click "Manual Deploy" → "Clear build cache & deploy"

3. **Check CORS:**
   - Go to backend service → Environment
   - Ensure `FRONTEND_ORIGINS` includes your frontend URL

---

### Issue: "Service Unavailable" (503)

**Error:** Render shows 503 error

**Causes:**
1. **Service is still deploying** - Wait 5-10 minutes
2. **Build failed** - Check "Logs" tab for errors
3. **Health check failing** - Verify `/health` endpoint works

**Solution:**
1. Click "Logs" tab
2. Look for:
   - Build errors: `npm install` failures, missing dependencies
   - Runtime errors: Uncaught exceptions, missing environment variables

3. Common fixes:
   - Missing `SUPABASE_URL` or `SUPABASE_KEY`
   - Wrong `PORT` (Render overrides - leave it as Render sets it)
   - Database connection issues

---

### Issue: Free Tier Services Spin Down

**Behavior:** Free tier services spin down after 15 minutes of inactivity

**Impact:**
- First request after spin-down takes 30-60 seconds (cold start)
- Subsequent requests are fast

**Solutions:**
1. **Upgrade to Starter plan ($7/month):**
   - Settings → "Instance Type" → "Starter"
   - No more spin-downs

2. **Use a ping service (free tier workaround):**
   - [UptimeRobot](https://uptimerobot.com) - ping every 5 minutes
   - [Cron-Job.org](https://cron-job.org) - scheduled HTTP requests
   - Keeps your service warm

3. **Accept cold starts (free tier):**
   - Communicate to users: "First load may be slow"

---

### Issue: Environment Variables Not Updating

**Error:** Changed env var but app still uses old value

**Solution:**
1. **Ensure you clicked "Save Changes"** after editing variables
2. **Redeploy:**
   - Render auto-redeploys when you save env vars
   - Or manually: "Manual Deploy" → "Deploy latest commit"

3. **Clear build cache (for Docker builds):**
   - "Manual Deploy" → "Clear build cache & deploy"

---

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` | Can't connect to Supabase | Check `SUPABASE_URL` is correct |
| `JWT malformed` | Invalid or missing `JWT_SECRET` | Regenerate with `openssl rand -hex 32` |
| `CORS blocked` | Frontend URL not in `FRONTEND_ORIGINS` | Add frontend URL to backend env var |
| `Module not found` | `npm install` failed or cache issue | Clear build cache and redeploy |

---

## Cost Estimate

Render offers a generous free tier:

### Free Tier
- **Static sites:** 100GB bandwidth/month (free forever)
- **Web services:** 750 hours/month (spins down after 15 min inactivity)
- **PostgreSQL:** 90-day free trial, then $7/month

**Total for free tier:** $0/month (for 90 days)

### Paid Tier (Production-Ready)

| Service | Plan | Cost |
|---------|------|------|
| Backend (Web Service) | Starter | $7/month |
| Frontend (Static Site) | Free | $0/month |
| Database (Supabase) | Free tier | $0/month (500MB) |
| **Total** | | **$7/month** |

### Cost Comparison

| Platform | Backend | Frontend | Database | Total |
|----------|---------|----------|----------|-------|
| Render | $7/mo | Free | Free (Supabase) | **$7/mo** |
| Railway | $3-5/mo | $0-2/mo | Free (Supabase) | $5-10/mo |
| Heroku | $7/mo | $7/mo | $9/mo | $23/mo |
| DigitalOcean | $12/mo | $5/mo | $15/mo | $32/mo |

**Best for:**
- Teams wanting predictable pricing
- Free tier for testing/staging environments
- Static sites (free forever)

---

## Updating Your Deployment

Render supports automatic deployments:

### Enable Auto-Deploy (Default)

Auto-deploy is enabled by default when you connect a GitHub repo.

**How it works:**
1. You push to GitHub (`git push origin main`)
2. Render detects the push
3. Automatically builds and deploys

**Disable auto-deploy:**
- Settings → "Auto-Deploy" → Toggle off

### Manual Deployment

1. Go to your service in Render
2. Click "Manual Deploy"
3. Select:
   - "Deploy latest commit" (default)
   - "Clear build cache & deploy" (if you have caching issues)

### Rollback to Previous Deployment

1. Click "Events" tab
2. Find a previous successful deployment
3. Click "Rollback to this version"

**Note:** Rollback is instant (no rebuild needed)

### Database Migrations

For Supabase migrations:

1. **Option 1: Supabase Dashboard**
   - Go to Supabase → SQL Editor
   - Run your migration SQL

2. **Option 2: Supabase CLI**
   ```bash
   npx supabase db push
   ```

3. **Option 3: Render Shell** (for Render PostgreSQL)
   - Click "Shell" tab in Render
   - Run migrations:
   ```bash
   npm run migrate
   ```

---

## Render CLI (Advanced)

Render offers a CLI for advanced workflows:

### Install
```bash
brew tap render-oss/render  # macOS
brew install render
```

Or via npm:
```bash
npm install -g render-cli
```

### Login
```bash
render login
```

### Deploy from CLI
```bash
render deploy
```

### View Logs
```bash
render logs -s agentauth-api
```

### Run Shell Commands
```bash
render shell -s agentauth-api
```

---

## Best Practices

### 1. Use Docker for Consistency
- Static site builds can be inconsistent across environments
- Docker ensures your frontend builds the same way locally and on Render

### 2. Separate Staging and Production
- Create two Render services:
  - `agentauth-api-staging` (free tier, deploys from `develop` branch)
  - `agentauth-api-production` (paid tier, deploys from `main` branch)

### 3. Enable Notifications
- Settings → "Notifications" → Enable deploy notifications
- Get notified on:
  - Deploy success
  - Deploy failure
  - Health check failures

### 4. Use Preview Environments
- Render creates preview environments for pull requests
- Settings → "Enable PR previews"
- Test changes before merging to `main`

### 5. Monitor Logs
- Use Render's built-in logs (Dashboard → Logs tab)
- Or forward logs to external services:
  - Datadog
  - Papertrail
  - Logtail

---

## Next Steps

- [Set up monitoring and alerts](../monitoring.md)
- [Configure CI/CD with GitHub Actions](../cicd.md)
- [Add a status page](https://statuspage.io)
- [Scale your application](https://render.com/docs/scaling)

---

## Support

- **Render Docs:** [render.com/docs](https://render.com/docs)
- **Render Community:** [community.render.com](https://community.render.com)
- **AgentAuth Support:** umytbaynazarow754@gmail.com

---

**Last Updated:** January 31, 2026
