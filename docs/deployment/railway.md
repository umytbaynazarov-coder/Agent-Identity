# Railway Deployment Guide

Deploy AgentAuth to Railway in under 10 minutes. Railway provides automatic deployments, PostgreSQL databases, and excellent developer experience.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (5 minutes)](#quick-start-5-minutes)
3. [Environment Variables](#environment-variables)
4. [Custom Domain Setup](#custom-domain-setup)
5. [Database Setup](#database-setup)
6. [Troubleshooting](#troubleshooting)
7. [Cost Estimate](#cost-estimate)
8. [Updating Your Deployment](#updating-your-deployment)

---

## Prerequisites

- GitHub account
- Railway account (free - sign up at [railway.app](https://railway.app))
- Supabase project (free - [supabase.com](https://supabase.com))

---

## Quick Start (5 minutes)

### Step 1: Fork the Repository

1. Go to [https://github.com/umyt-dev/Agent-Identity](https://github.com/umyt-dev/Agent-Identity)
2. Click **Fork** in the top-right corner
3. Wait for the fork to complete

### Step 2: Deploy Backend to Railway

1. **Sign in to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "Login" and authenticate with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your forked `Agent-Identity` repository

3. **Configure Backend Service**
   - Railway will detect multiple services
   - First, deploy the **backend** (agentauth directory)
   - Click "Add variables" to set environment variables:

   | Variable | Value | Where to Get |
   |----------|-------|--------------|
   | `SUPABASE_URL` | Your Supabase project URL | [Supabase Dashboard](https://app.supabase.com) → Project Settings → API |
   | `SUPABASE_KEY` | Your Supabase anon key | Same location as above |
   | `JWT_SECRET` | Random 32-char string | Run `openssl rand -hex 32` in terminal |
   | `NODE_ENV` | `production` | Leave as-is |
   | `PORT` | Railway auto-sets this | Leave empty (Railway handles it) |

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - Railway will provide a public URL like `agentauth-production.up.railway.app`

### Step 3: Deploy Frontend to Railway

1. **Add Frontend Service**
   - In the same Railway project, click "New Service"
   - Select "Deploy from GitHub repo"
   - Choose the same `Agent-Identity` repository
   - Select the `agentauth-dashboard` directory

2. **Configure Frontend Service**
   - Click "Variables" and add:

   | Variable | Value | Example |
   |----------|-------|---------|
   | `VITE_API_BASE_URL` | Your backend URL from Step 2 | `https://agentauth-production.up.railway.app` |

3. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build
   - Railway will provide a frontend URL like `dashboard-production.up.railway.app`

### Step 4: Update CORS Settings

1. Go back to your **backend service** in Railway
2. Add/update the `FRONTEND_ORIGINS` environment variable:
   ```
   https://dashboard-production.up.railway.app,http://localhost:5173
   ```
3. Redeploy the backend service

### Step 5: Test Your Deployment

1. Visit your frontend URL (from Step 3)
2. You should see the AgentAuth dashboard
3. Try registering a test agent

**🎉 You're live!**

---

## Environment Variables

### Backend (agentauth)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SUPABASE_URL` | ✅ Yes | Your Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | ✅ Yes | Supabase anon/public key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `JWT_SECRET` | ✅ Yes | Secret for signing JWTs (32+ chars) | `a1b2c3d4e5f6...` (use `openssl rand -hex 32`) |
| `NODE_ENV` | Recommended | Set to `production` | `production` |
| `PORT` | Auto-set | Railway sets this automatically | (Leave empty) |
| `FRONTEND_ORIGINS` | Recommended | CORS allowed origins (comma-separated) | `https://yourdomain.com,https://dashboard.railway.app` |
| `RATE_LIMIT_WINDOW_MS` | Optional | Rate limit window in ms | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Optional | Max requests per window | `100` |

**How to Generate JWT_SECRET:**
```bash
openssl rand -hex 32
```

### Frontend (agentauth-dashboard)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_BASE_URL` | ✅ Yes | Backend API URL (from Railway) | `https://agentauth-production.up.railway.app` |

---

## Custom Domain Setup

Railway makes custom domains easy:

### Step 1: Add Domain to Backend

1. Go to your **backend service** in Railway
2. Click "Settings" → "Domains"
3. Click "Custom Domain"
4. Enter your domain: `api.yourdomain.com`
5. Railway will provide DNS records:
   - **CNAME**: `api.yourdomain.com` → `yourproject.up.railway.app`

### Step 2: Configure DNS

Add the CNAME record to your DNS provider (Cloudflare, Namecheap, etc.):

| Type | Name | Value |
|------|------|-------|
| CNAME | `api` | `yourproject.up.railway.app` |

### Step 3: Add Domain to Frontend

1. Go to your **frontend service** in Railway
2. Click "Settings" → "Domains" → "Custom Domain"
3. Enter: `dashboard.yourdomain.com` or `agentauth.yourdomain.com`
4. Add CNAME record:

| Type | Name | Value |
|------|------|-------|
| CNAME | `dashboard` | `yourproject-dashboard.up.railway.app` |

### Step 4: Update Environment Variables

1. **Backend**: Update `FRONTEND_ORIGINS` to include your custom domain:
   ```
   https://dashboard.yourdomain.com,http://localhost:5173
   ```

2. **Frontend**: Update `VITE_API_BASE_URL`:
   ```
   https://api.yourdomain.com
   ```

3. Redeploy both services

### Step 5: Enable HTTPS (Automatic)

Railway automatically provisions SSL certificates via Let's Encrypt. Wait 5-10 minutes after DNS propagation.

**Verify HTTPS:**
```bash
curl https://api.yourdomain.com/health
# Should return: {"status":"ok"}
```

---

## Database Setup

AgentAuth uses Supabase PostgreSQL (already configured in Quick Start).

### Option 1: Use Supabase (Recommended)

**Pros:**
- Free tier: 500MB database, unlimited API requests
- Automatic backups
- Web-based SQL editor
- Auth, Storage, and Realtime features

**Setup:**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy `SUPABASE_URL` and `SUPABASE_KEY` from Settings → API
4. Add to Railway environment variables (done in Quick Start)

### Option 2: Use Railway PostgreSQL (Alternative)

If you prefer Railway-managed PostgreSQL:

1. In Railway, click "New" → "Database" → "Add PostgreSQL"
2. Railway will auto-populate `DATABASE_URL` variable
3. Update your backend code to use `DATABASE_URL` instead of Supabase client

**Note:** The current AgentAuth backend is built for Supabase. Using Railway PostgreSQL requires code changes.

---

## Troubleshooting

### Issue: Backend Build Fails

**Error:** `npm install failed` or `node version mismatch`

**Solution:**
1. Check Railway build logs (click service → "Deployments" → latest deployment)
2. Verify `package.json` has correct Node version:
   ```json
   "engines": {
     "node": ">=18.0.0"
   }
   ```
3. Railway uses Node 20 by default (compatible)

---

### Issue: Frontend Shows "Network Error"

**Error:** Dashboard loads but API calls fail

**Solution:**
1. **Check `VITE_API_BASE_URL`:**
   - Go to frontend service → Variables
   - Ensure it matches your backend URL (with `https://`)
   - Should NOT end with a slash

2. **Check CORS settings:**
   - Go to backend service → Variables
   - Ensure `FRONTEND_ORIGINS` includes your frontend URL

3. **Rebuild frontend:**
   - The `VITE_API_BASE_URL` is baked into the frontend build
   - After changing variables, click "Redeploy" (not just restart)

---

### Issue: "502 Bad Gateway"

**Error:** Railway shows 502 error

**Solution:**
1. **Check health endpoint:**
   - Your backend should respond to `/health` with 200 OK
   - Verify in `railway.json`:
     ```json
     {
       "deploy": {
         "healthcheckPath": "/health"
       }
     }
     ```

2. **Check logs:**
   - Click service → "Logs"
   - Look for application errors or crashes

3. **Check environment variables:**
   - Missing `SUPABASE_URL` or `SUPABASE_KEY` will cause crashes
   - Ensure all required variables are set

---

### Issue: Database Connection Fails

**Error:** `Failed to connect to Supabase` or `unauthorized`

**Solution:**
1. **Verify Supabase credentials:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Settings → API → Copy URL and anon key
   - **Important:** Use the **anon/public key**, NOT the service role key

2. **Check Supabase project status:**
   - Ensure your Supabase project is active (not paused)
   - Free tier projects pause after 1 week of inactivity

3. **Test connection:**
   ```bash
   curl https://YOUR_SUPABASE_URL/rest/v1/
   -H "apikey: YOUR_SUPABASE_KEY"
   ```

---

### Issue: Railway Deployment Slow

**Error:** Build takes >5 minutes

**Solution:**
1. **Enable build caching:**
   - Railway automatically caches `node_modules`
   - Ensure you're not deleting `package-lock.json`

2. **Optimize Dockerfile:**
   - The existing Dockerfiles are already optimized
   - Multi-stage builds reduce final image size

3. **Check Railway status:**
   - Visit [Railway Status](https://status.railway.app)
   - Slowness may be temporary

---

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` | Backend can't reach Supabase | Check `SUPABASE_URL` and internet connectivity |
| `JWT malformed` | Invalid `JWT_SECRET` | Regenerate with `openssl rand -hex 32` |
| `CORS policy blocked` | Frontend URL not in `FRONTEND_ORIGINS` | Add frontend URL to backend env var |
| `404 Not Found` on API | Wrong `VITE_API_BASE_URL` | Update frontend env var and redeploy |

---

## Cost Estimate

Railway uses a credit-based pricing model:

### Free Tier (Hobby Plan)
- **$5 free credits/month** (no credit card required)
- **$5 = ~500 hours** of service uptime
- **Enough for:** 1 backend + 1 frontend running 24/7 for a month

### Paid Tier (Production)
- **$5/month base** (includes $5 credits)
- **$10/GB/month** for additional usage
- **Typical usage for starter project:**
  - Backend: ~$3/month (1GB RAM, 1 vCPU)
  - Frontend: ~$2/month (static hosting)
  - **Total: $5-10/month**

### Cost Comparison

| Service | Railway | Render | Heroku | DigitalOcean |
|---------|---------|--------|--------|--------------|
| Backend | $3-5/mo | $7/mo  | $7/mo  | $12/mo       |
| Frontend | $0-2/mo | Free   | $7/mo  | $5/mo        |
| Database | Free (Supabase) | Free (Supabase) | $9/mo | $15/mo |
| **Total** | **$5-10/mo** | **$7/mo** | **$23/mo** | **$32/mo** |

**Best for:** Solo developers, MVPs, side projects

---

## Updating Your Deployment

Railway supports automatic deployments from GitHub:

### Enable Auto-Deploy (Recommended)

1. Go to your service in Railway
2. Click "Settings" → "Source"
3. Toggle "Auto-deploy on push"
4. Now every `git push` to `main` will automatically deploy

### Manual Deployment

1. Go to your service in Railway
2. Click "Deployments"
3. Click "Redeploy" on the latest deployment

### Rollback to Previous Version

1. Go to "Deployments"
2. Find a previous successful deployment
3. Click "..." → "Redeploy"

### Database Migrations

If you add database migrations:

1. Connect to your Supabase project
2. Run migrations via Supabase Dashboard → SQL Editor
3. Or use Supabase CLI:
   ```bash
   npx supabase db push
   ```

---

## Railway CLI (Advanced)

For advanced users, Railway offers a CLI:

### Install
```bash
npm install -g @railway/cli
```

### Login
```bash
railway login
```

### Link Project
```bash
cd /path/to/Agent-Identity
railway link
```

### View Logs
```bash
railway logs
```

### Run Commands in Railway Environment
```bash
railway run npm test
```

### Deploy from CLI
```bash
railway up
```

---

## Best Practices

### 1. Use Environment Variables for Secrets
❌ **Don't** hardcode secrets in code:
```javascript
const JWT_SECRET = "my-secret-key"; // NEVER DO THIS
```

✅ **Do** use environment variables:
```javascript
const JWT_SECRET = process.env.JWT_SECRET;
```

### 2. Enable Health Checks
Ensure your `railway.json` includes:
```json
{
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30
  }
}
```

### 3. Monitor Logs
- Set up log monitoring (Railway has built-in logs)
- Use error tracking (Sentry, LogRocket)

### 4. Set Up Alerts
- Railway can send alerts on deployment failures
- Settings → Notifications

### 5. Use Custom Domains for Production
- Don't rely on `*.railway.app` URLs in production
- Custom domains are free and look professional

---

## Next Steps

- [Set up CI/CD with GitHub Actions](../cicd.md)
- [Configure monitoring and alerts](../monitoring.md)
- [Add a status page](https://status.railway.app)
- [Scale your application](https://docs.railway.app/reference/scaling)

---

## Support

- **Railway Docs:** [docs.railway.app](https://docs.railway.app)
- **Railway Discord:** [discord.gg/railway](https://discord.gg/railway)
- **AgentAuth Support:** umytbaynazarow754@gmail.com

---

**Last Updated:** January 31, 2026
