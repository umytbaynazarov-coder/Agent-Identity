# AgentAuth Dashboard - Deployment Guide

This guide covers deploying the AgentAuth Dashboard to production using Docker.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Running AgentAuth API instance
- Admin agent with `*:*:*` permission

## Local Docker Deployment

### 1. Build and Run

From the project root directory:

```bash
docker-compose up -d --build
```

This will:
- Build the dashboard Docker image
- Build the API Docker image (if not already built)
- Start both services
- Create a shared network

### 2. Access the Dashboard

- **Dashboard**: [http://localhost:8080](http://localhost:8080)
- **API**: [http://localhost:3000](http://localhost:3000)

### 3. Create Admin Agent

If you haven't already, create an admin agent:

```bash
curl -X POST http://localhost:3000/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dashboard Admin",
    "owner_email": "admin@example.com",
    "permissions": ["*:*:*"],
    "tier": "enterprise"
  }'
```

Save the returned `agent_id` and `api_key` for dashboard login.

### 4. Login

1. Navigate to [http://localhost:8080](http://localhost:8080)
2. Enter your `agent_id` and `api_key`
3. Click "Sign In"

## Production Deployment

### Environment Configuration

Create a `.env` file in the project root:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-jwt-secret-key

# API Configuration
NODE_ENV=production
PORT=3000

# Dashboard Configuration
VITE_API_BASE_URL=https://api.agentauth.com

# CORS Origins (comma-separated)
FRONTEND_ORIGINS=https://dashboard.agentauth.com,https://app.agentauth.com
```

### Docker Compose Production

Update `docker-compose.yml` for production:

```yaml
version: '3.8'

services:
  agentauth-api:
    build: ./agentauth
    container_name: agentauth-api
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - FRONTEND_ORIGINS=${FRONTEND_ORIGINS}
    networks:
      - agentauth-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  agentauth-dashboard:
    build:
      context: ./agentauth-dashboard
      args:
        - VITE_API_BASE_URL=${VITE_API_BASE_URL}
    container_name: agentauth-dashboard
    restart: always
    depends_on:
      - agentauth-api
    networks:
      - agentauth-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx-proxy:
    image: nginx:alpine
    container_name: nginx-proxy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - agentauth-api
      - agentauth-dashboard
    networks:
      - agentauth-network

networks:
  agentauth-network:
    driver: bridge
```

### HTTPS with Let's Encrypt

#### 1. Install Certbot

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
```

#### 2. Obtain SSL Certificate

```bash
sudo certbot certonly --standalone \
  -d api.agentauth.com \
  -d dashboard.agentauth.com \
  --agree-tos \
  --email admin@agentauth.com
```

#### 3. Configure nginx for HTTPS

Create `nginx/nginx.conf`:

```nginx
http {
    upstream api {
        server agentauth-api:3000;
    }

    upstream dashboard {
        server agentauth-dashboard:80;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name api.agentauth.com dashboard.agentauth.com;
        return 301 https://$host$request_uri;
    }

    # API Server
    server {
        listen 443 ssl http2;
        server_name api.agentauth.com;

        ssl_certificate /etc/letsencrypt/live/api.agentauth.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/api.agentauth.com/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        location / {
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # Dashboard Server
    server {
        listen 443 ssl http2;
        server_name dashboard.agentauth.com;

        ssl_certificate /etc/letsencrypt/live/dashboard.agentauth.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/dashboard.agentauth.com/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        location / {
            proxy_pass http://dashboard;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

#### 4. Auto-Renew Certificates

Add to crontab:

```bash
0 0 1 * * certbot renew --quiet && docker-compose restart nginx-proxy
```

## Cloud Deployment

### AWS ECS

1. **Create ECR Repositories:**
   ```bash
   aws ecr create-repository --repository-name agentauth/dashboard
   aws ecr create-repository --repository-name agentauth/api
   ```

2. **Build and Push Images:**
   ```bash
   # Login to ECR
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

   # Build and push
   docker build -t agentauth/dashboard ./agentauth-dashboard
   docker tag agentauth/dashboard:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/agentauth/dashboard:latest
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/agentauth/dashboard:latest
   ```

3. **Create ECS Task Definition** with both containers

4. **Deploy to ECS Service**

### Google Cloud Run

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/agentauth-dashboard ./agentauth-dashboard

# Deploy to Cloud Run
gcloud run deploy agentauth-dashboard \
  --image gcr.io/PROJECT_ID/agentauth-dashboard \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars VITE_API_BASE_URL=https://api.agentauth.com
```

### DigitalOcean App Platform

1. Connect your Git repository
2. Configure build settings:
   - **Dockerfile Path**: `agentauth-dashboard/Dockerfile`
   - **HTTP Port**: `80`
3. Add environment variables
4. Deploy

## Monitoring

### Health Checks

Both services expose health check endpoints:

- **API**: `GET /health`
- **Dashboard**: `GET /health`

### Docker Container Logs

```bash
# View all logs
docker-compose logs -f

# View dashboard logs
docker-compose logs -f agentauth-dashboard

# View API logs
docker-compose logs -f agentauth-api
```

### Metrics

Add Prometheus + Grafana for metrics:

```yaml
# Add to docker-compose.yml
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
```

## Troubleshooting

### Dashboard not loading

1. Check container status:
   ```bash
   docker ps
   ```

2. Check logs:
   ```bash
   docker-compose logs agentauth-dashboard
   ```

3. Verify API connection:
   ```bash
   curl http://localhost:3000/health
   ```

### CORS errors

Update `FRONTEND_ORIGINS` in backend `.env`:

```env
FRONTEND_ORIGINS=http://localhost:8080,https://dashboard.agentauth.com
```

Restart services:

```bash
docker-compose restart agentauth-api
```

### Build failures

1. Clear Docker cache:
   ```bash
   docker-compose build --no-cache
   ```

2. Prune Docker system:
   ```bash
   docker system prune -a
   ```

### SSL certificate issues

1. Test certificate renewal:
   ```bash
   sudo certbot renew --dry-run
   ```

2. Check certificate expiry:
   ```bash
   sudo certbot certificates
   ```

## Performance Optimization

### Enable Gzip Compression

Already enabled in `nginx.conf` for:
- HTML, CSS, JavaScript
- JSON, XML
- Fonts

### CDN Integration

Use CloudFlare or AWS CloudFront:

1. Point DNS to CDN
2. Configure origin to your dashboard URL
3. Enable caching for static assets
4. Set cache TTL to 1 year for `/assets/*`

### Database Connection Pooling

Ensure Supabase connection pooling is enabled for high-traffic deployments.

## Security Best Practices

1. **Use HTTPS everywhere**
2. **Rotate JWT secrets regularly**
3. **Enable rate limiting** in nginx
4. **Use security headers** (already configured)
5. **Regularly update Docker images**
6. **Scan for vulnerabilities:**
   ```bash
   docker scan agentauth-dashboard
   ```

## Backup and Recovery

### Database Backups

Supabase provides automatic backups. For additional safety:

```bash
# Export backup
pg_dump -h db.supabase.co -U postgres -d agentauth > backup.sql

# Restore
psql -h db.supabase.co -U postgres -d agentauth < backup.sql
```

### Configuration Backups

Back up `.env` and `docker-compose.yml` to a secure location.

## Scaling

### Horizontal Scaling

Use Docker Swarm or Kubernetes:

```yaml
# docker-compose.yml (Swarm mode)
version: '3.8'

services:
  agentauth-dashboard:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
```

### Load Balancing

Add nginx load balancer:

```nginx
upstream dashboard {
    least_conn;
    server dashboard-1:80;
    server dashboard-2:80;
    server dashboard-3:80;
}
```

## Support

For deployment issues:
- GitHub Issues: https://github.com/agentauth/agentauth/issues
- Documentation: https://docs.agentauth.com
