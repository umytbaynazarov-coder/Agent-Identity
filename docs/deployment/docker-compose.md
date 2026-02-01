# Self-Hosted Docker Compose Deployment Guide

Deploy AgentAuth on your own infrastructure with full control. This guide covers production-ready setup with HTTPS, automated backups, security hardening, and optional monitoring.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (15 minutes)](#quick-start-15-minutes)
3. [Production Setup with HTTPS](#production-setup-with-https)
4. [Environment Configuration](#environment-configuration)
5. [Database Backup & Restore](#database-backup--restore)
6. [Upgrade Procedure](#upgrade-procedure)
7. [Security Hardening](#security-hardening)
8. [Monitoring Setup (Optional)](#monitoring-setup-optional)
9. [Troubleshooting](#troubleshooting)
10. [Performance Tuning](#performance-tuning)

---

## Prerequisites

### Required

- **Linux server** (Ubuntu 22.04 LTS, Debian 11+, or CentOS 8+)
- **Docker 20+** and **Docker Compose 2+**
  - Installation guides:
    - [Install Docker](https://docs.docker.com/engine/install/)
    - [Install Docker Compose](https://docs.docker.com/compose/install/)
- **Domain name** (for HTTPS setup)
- **Supabase account** (free - for PostgreSQL database)
- **Minimum specs:**
  - 1 vCPU
  - 1GB RAM
  - 10GB disk space
  - Public IP address

### Recommended

- 2 vCPUs, 2GB RAM (for production)
- 20GB disk space (for logs and backups)
- Firewall configured (UFW or iptables)

---

## Quick Start (15 minutes)

Get AgentAuth running locally or on a server in minutes:

### Step 1: Clone Repository

```bash
git clone https://github.com/umyt-dev/Agent-Identity.git
cd Agent-Identity
```

### Step 2: Create Environment File

```bash
cp agentauth/.env.example .env
```

Edit `.env` with your favorite editor:

```bash
nano .env
```

**Required variables:**

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=your_generated_secret_here

# Frontend URL (update after deployment)
FRONTEND_ORIGINS=http://localhost:8080,http://your-domain.com
```

**Generate JWT_SECRET:**
```bash
openssl rand -hex 32
```

### Step 3: Start Services

```bash
docker-compose up -d
```

This starts:
- **Backend API** on `http://localhost:3000`
- **Dashboard** on `http://localhost:8080`

### Step 4: Verify Deployment

```bash
# Check services are running
docker-compose ps

# Test backend health
curl http://localhost:3000/health
# Should return: {"status":"ok"}

# View logs
docker-compose logs -f
```

### Step 5: Access Dashboard

1. Open browser to `http://localhost:8080`
2. You should see the AgentAuth dashboard
3. Create your first agent!

**🎉 AgentAuth is running!**

---

## Production Setup with HTTPS

For production deployments, you need HTTPS. This section covers Let's Encrypt SSL with nginx reverse proxy.

### Architecture

```
Internet → nginx (HTTPS:443) → AgentAuth Backend (HTTP:3000)
        └→ nginx (HTTPS:443) → AgentAuth Dashboard (HTTP:8080)
```

### Step 1: Install nginx

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 2: Configure nginx Reverse Proxy

Create backend config:

```bash
sudo nano /etc/nginx/sites-available/agentauth-api
```

**Backend configuration (`/etc/nginx/sites-available/agentauth-api`):**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (no buffering)
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_buffering off;
        access_log off;
    }
}
```

Create frontend config:

```bash
sudo nano /etc/nginx/sites-available/agentauth-dashboard
```

**Frontend configuration (`/etc/nginx/sites-available/agentauth-dashboard`):**

```nginx
server {
    listen 80;
    server_name dashboard.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### Step 3: Enable Sites

```bash
# Enable configurations
sudo ln -s /etc/nginx/sites-available/agentauth-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/agentauth-dashboard /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 4: Configure DNS

Add DNS records for your domain:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `api` | `YOUR_SERVER_IP` | 3600 |
| A | `dashboard` | `YOUR_SERVER_IP` | 3600 |

Wait for DNS propagation (5-30 minutes).

### Step 5: Obtain SSL Certificates

```bash
# Get SSL for backend
sudo certbot --nginx -d api.yourdomain.com

# Get SSL for frontend
sudo certbot --nginx -d dashboard.yourdomain.com
```

Follow prompts:
- Enter email for renewal notifications
- Agree to Terms of Service
- Choose redirect HTTP to HTTPS: **Yes**

**Certbot automatically:**
- Obtains Let's Encrypt certificates
- Configures nginx for HTTPS
- Sets up auto-renewal (cron job)

### Step 6: Verify SSL

```bash
# Test backend SSL
curl https://api.yourdomain.com/health
# Should return: {"status":"ok"}

# Check SSL grade
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=api.yourdomain.com
```

### Step 7: Update Environment Variables

Update `.env` with your new HTTPS URLs:

```bash
FRONTEND_ORIGINS=https://dashboard.yourdomain.com
```

Update `docker-compose.yml`:

```yaml
environment:
  - VITE_API_BASE_URL=https://api.yourdomain.com
```

Restart services:

```bash
docker-compose down
docker-compose up -d
```

### Step 8: Test HTTPS Deployment

1. Visit `https://dashboard.yourdomain.com`
2. Register a test agent
3. Verify authentication works

**🎉 Production deployment complete!**

---

## Environment Configuration

### Backend Environment Variables

**`.env` file:**

```bash
# Supabase Configuration (Required)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Secret (Required - 32+ characters)
JWT_SECRET=<generate with: openssl rand -hex 32>

# CORS Configuration (Recommended)
FRONTEND_ORIGINS=https://dashboard.yourdomain.com,http://localhost:5173

# Rate Limiting (Optional)
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_MAX_AUTH_REQUESTS=10

# Logging (Optional)
LOG_LEVEL=info  # Options: debug, info, warn, error
```

### Frontend Environment Variables

**In `docker-compose.yml`:**

```yaml
agentauth-dashboard:
  environment:
    - VITE_API_BASE_URL=https://api.yourdomain.com  # Update with your domain
```

---

## Database Backup & Restore

### Automated Backup Script

Create backup script:

```bash
sudo nano /usr/local/bin/backup-supabase.sh
```

**Backup script content:**

```bash
#!/bin/bash

# Supabase backup script
# This backs up data via Supabase API (for self-hosted, use pg_dump)

BACKUP_DIR="/var/backups/agentauth"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Export data (example - adjust based on your schema)
# For Supabase, use their CLI or API
echo "Starting backup at $DATE"

# Option 1: Supabase CLI
npx supabase db dump --db-url="$DATABASE_URL" -f "$BACKUP_DIR/agentauth_$DATE.sql"

# Option 2: Direct PostgreSQL (if you have direct access)
# pg_dump -h localhost -U postgres -d agentauth > "$BACKUP_DIR/agentauth_$DATE.sql"

# Compress backup
gzip "$BACKUP_DIR/agentauth_$DATE.sql"

# Remove old backups (older than 30 days)
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: agentauth_$DATE.sql.gz"
```

Make executable:

```bash
sudo chmod +x /usr/local/bin/backup-supabase.sh
```

### Schedule Daily Backups

Add to crontab:

```bash
sudo crontab -e
```

Add this line (runs daily at 2 AM):

```bash
0 2 * * * /usr/local/bin/backup-supabase.sh >> /var/log/agentauth-backup.log 2>&1
```

### Restore from Backup

```bash
# Decompress backup
gunzip /var/backups/agentauth/agentauth_20260131_020000.sql.gz

# Restore (Supabase)
npx supabase db reset --db-url="$DATABASE_URL"
psql "$DATABASE_URL" < /var/backups/agentauth/agentauth_20260131_020000.sql
```

---

## Upgrade Procedure

### Step 1: Backup Before Upgrade

```bash
# Run backup script
sudo /usr/local/bin/backup-supabase.sh

# Backup docker-compose.yml and .env
cp docker-compose.yml docker-compose.yml.backup
cp .env .env.backup
```

### Step 2: Pull Latest Code

```bash
cd /path/to/Agent-Identity

# Fetch latest changes
git fetch origin

# Check what's new
git log HEAD..origin/main --oneline

# Pull latest version
git pull origin main
```

### Step 3: Pull New Docker Images

```bash
# Pull latest images
docker-compose pull

# OR rebuild from source
docker-compose build --no-cache
```

### Step 4: Run Database Migrations (if any)

Check `CHANGELOG.md` for migration instructions:

```bash
# If migrations are needed
npx supabase migration up
```

### Step 5: Restart Services

```bash
# Stop services
docker-compose down

# Start with new version
docker-compose up -d

# Check logs for errors
docker-compose logs -f
```

### Step 6: Verify Upgrade

```bash
# Test health endpoint
curl http://localhost:3000/health

# Check service versions
docker-compose ps

# Test dashboard
curl http://localhost:8080
```

### Rollback (if needed)

```bash
# Stop services
docker-compose down

# Restore old version
git checkout <previous-commit-hash>

# Restore configs
cp docker-compose.yml.backup docker-compose.yml
cp .env.backup .env

# Start old version
docker-compose up -d
```

---

## Security Hardening

### 1. Firewall Configuration (UFW)

```bash
# Install UFW
sudo apt install ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (IMPORTANT - don't lock yourself out!)
sudo ufw allow ssh
# Or specific port: sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### 2. Fail2Ban (Prevent Brute Force)

```bash
# Install fail2ban
sudo apt install fail2ban

# Create custom jail for nginx
sudo nano /etc/fail2ban/jail.local
```

**Fail2Ban configuration:**

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
```

Start fail2ban:

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check banned IPs
sudo fail2ban-client status nginx-limit-req
```

### 3. Docker Security

**Limit container resources:**

Update `docker-compose.yml`:

```yaml
services:
  agentauth-api:
    # ... existing config ...
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

**Run containers as non-root (already configured in Dockerfiles):**

Verify in `agentauth/Dockerfile`:
```dockerfile
USER node  # Runs as non-root user
```

### 4. Environment Variable Security

**Never commit `.env` to git:**

```bash
# Ensure .env is in .gitignore
echo ".env" >> .gitignore
```

**Set proper permissions:**

```bash
chmod 600 .env  # Only owner can read/write
chown root:root .env  # Owned by root
```

### 5. Enable HTTPS Strict Transport Security (HSTS)

Add to nginx config:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

Reload nginx:

```bash
sudo systemctl reload nginx
```

### 6. Disable Root Login (SSH)

```bash
sudo nano /etc/ssh/sshd_config
```

Change:
```
PermitRootLogin no
```

Restart SSH:

```bash
sudo systemctl restart sshd
```

### 7. Keep System Updated

```bash
# Enable automatic security updates (Ubuntu/Debian)
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## Monitoring Setup (Optional)

### Option 1: Basic Monitoring with Prometheus + Grafana

**Create `docker-compose.monitoring.yml`:**

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
    networks:
      - agentauth-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=changeme
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - agentauth-network
    restart: unless-stopped

volumes:
  prometheus-data:
  grafana-data:

networks:
  agentauth-network:
    external: true
```

**Create `prometheus.yml`:**

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'agentauth'
    static_configs:
      - targets: ['agentauth-api:3000']
```

**Start monitoring stack:**

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

**Access Grafana:**
- URL: `http://your-server:3001`
- Username: `admin`
- Password: `changeme` (change this!)

### Option 2: Lightweight Monitoring with Netdata

```bash
# Install Netdata
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Access dashboard
# Visit: http://your-server:19999
```

### Option 3: Cloud Monitoring (Recommended for Production)

**Sentry (Error Tracking):**

1. Sign up at [sentry.io](https://sentry.io)
2. Create new project
3. Add Sentry SDK to backend:

```bash
npm install @sentry/node
```

Update `server.js`:

```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

**BetterStack (Uptime Monitoring):**

1. Sign up at [betterstack.com](https://betterstack.com)
2. Add monitor for `https://api.yourdomain.com/health`
3. Set alert notifications

---

## Troubleshooting

### Issue: Containers Won't Start

**Error:** `docker-compose up` fails

**Solutions:**

1. **Check logs:**
   ```bash
   docker-compose logs agentauth-api
   docker-compose logs agentauth-dashboard
   ```

2. **Verify environment variables:**
   ```bash
   docker-compose config
   # Shows resolved configuration with env vars
   ```

3. **Check port conflicts:**
   ```bash
   # See if ports 3000 or 8080 are in use
   sudo lsof -i :3000
   sudo lsof -i :8080
   ```

4. **Rebuild images:**
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

---

### Issue: Can't Access from Outside

**Error:** Dashboard works on localhost but not from external IP

**Solutions:**

1. **Check firewall:**
   ```bash
   sudo ufw status
   # Ensure ports 80 and 443 are allowed
   ```

2. **Check nginx is running:**
   ```bash
   sudo systemctl status nginx
   ```

3. **Verify nginx config:**
   ```bash
   sudo nginx -t
   ```

4. **Check DNS propagation:**
   ```bash
   dig api.yourdomain.com
   # Should return your server IP
   ```

---

### Issue: SSL Certificate Renewal Fails

**Error:** Certbot renewal fails

**Solutions:**

1. **Test renewal:**
   ```bash
   sudo certbot renew --dry-run
   ```

2. **Check nginx config:**
   ```bash
   sudo nginx -t
   ```

3. **Renew manually:**
   ```bash
   sudo certbot renew --force-renewal
   ```

4. **Check certbot logs:**
   ```bash
   sudo tail -f /var/log/letsencrypt/letsencrypt.log
   ```

---

### Issue: High Memory Usage

**Error:** Server runs out of memory

**Solutions:**

1. **Check memory usage:**
   ```bash
   docker stats
   ```

2. **Limit container memory:**
   Update `docker-compose.yml` (see Security Hardening section)

3. **Enable swap:**
   ```bash
   # Create 2GB swap file
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile

   # Make permanent
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

4. **Restart services:**
   ```bash
   docker-compose restart
   ```

---

## Performance Tuning

### 1. Enable nginx Caching

```nginx
# Add to nginx config
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=agentauth_cache:10m max_size=100m inactive=60m;

location / {
    proxy_cache agentauth_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    # ... rest of proxy config ...
}
```

### 2. Enable Gzip Compression

```nginx
# Add to nginx config
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### 3. Optimize Docker

```bash
# Prune unused images and containers
docker system prune -a

# Set logging limits
# Add to docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### 4. Database Connection Pooling

Already configured in Supabase client, but if using direct PostgreSQL:

```javascript
const { Pool } = require('pg');
const pool = new Pool({
  max: 20,  // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## Cost Estimate

### Self-Hosting on Cloud Providers

| Provider | Specs | Cost |
|----------|-------|------|
| **Hetzner Cloud** | 2 vCPU, 2GB RAM, 40GB SSD | €4.51/month (~$5) |
| **DigitalOcean** | 1 vCPU, 1GB RAM, 25GB SSD | $6/month |
| **Linode** | 1 vCPU, 2GB RAM, 50GB SSD | $12/month |
| **AWS Lightsail** | 1 vCPU, 2GB RAM, 60GB SSD | $12/month |
| **Vultr** | 1 vCPU, 2GB RAM, 55GB SSD | $12/month |

**Additional costs:**
- Domain: $10-15/year
- Supabase: Free (500MB database)
- Total: **$5-12/month + domain**

**Best value:** Hetzner Cloud (Europe) or DigitalOcean (US)

---

## Summary

**Self-hosting is best for:**
- Full control over data and infrastructure
- Cost savings at scale (>100 agents)
- Compliance requirements (data residency)
- Learning DevOps and infrastructure

**Trade-offs:**
- Manual maintenance (updates, security patches)
- No managed support
- Responsible for backups and uptime

---

## Support

- **Docker Docs:** [docs.docker.com](https://docs.docker.com)
- **nginx Docs:** [nginx.org/en/docs/](http://nginx.org/en/docs/)
- **Let's Encrypt Docs:** [letsencrypt.org/docs/](https://letsencrypt.org/docs/)
- **AgentAuth Support:** umytbaynazarow754@gmail.com

---

**Last Updated:** January 31, 2026
