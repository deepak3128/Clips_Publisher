# Deployment Guide

## Table of Contents

1. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
2. [Backend Deployment (Railway)](#backend-deployment-railway)
3. [Database Deployment (PostgreSQL)](#database-deployment-postgresql)
4. [Storage Setup (Cloudflare R2)](#storage-setup-cloudflare-r2)
5. [Environment Configuration](#environment-configuration)
6. [Post-Deployment Steps](#post-deployment-steps)

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel account
- GitHub repository connected to Vercel

### Steps

1. **Push code to GitHub**
   ```bash
   git push origin main
   ```

2. **Create Vercel project**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Select GitHub repository
   - Import `frontend` directory

3. **Configure Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add:
     ```
     NEXT_PUBLIC_API_URL=https://your-backend-api.com
     ```

4. **Deploy**
   - Vercel automatically deploys on push to main

### Custom Domain

1. Add domain in Vercel Settings
2. Update DNS records as shown in Vercel dashboard
3. Wait for SSL certificate provisioning (5-30 minutes)

### Vercel CLI Deployment (Alternative)

```bash
npm install -g vercel
cd frontend
vercel
```

## Backend Deployment (Railway)

### Prerequisites
- Railway account
- GitHub repository

### Steps

1. **Create Railway project**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "GitHub Repo"
   - Choose your repository

2. **Create PostgreSQL Database**
   - In Railway Dashboard, click "+ New"
   - Select "Database" → "PostgreSQL"
   - It will auto-connect to your project

3. **Configure Environment Variables**
   - Go to project Variables tab
   - Add all variables from `.env.example`
   - Railway will set DATABASE_URL automatically

4. **Configure Build & Deploy**
   - Set Root Directory: `backend`
   - Set Build Command: `npm run build`
   - Set Start Command: `node dist/index.js`

5. **Deploy**
   - Railway automatically deploys on push
   - Monitor deploy logs in dashboard

### Get Backend URL

- In Railway Dashboard, go to Deployments
- Copy the generated URL (e.g., `https://autoshorts-api.railway.app`)
- Use this as `API_URL` in frontend environment variables

## Database Deployment (PostgreSQL)

### Option 1: Railway PostgreSQL (Recommended)

Already covered above.

### Option 2: AWS RDS

```bash
# 1. Create RDS instance
# - Engine: PostgreSQL 14+
# - Instance class: db.t3.micro (free tier)
# - Allocated storage: 20 GB
# - Multi-AZ: No (for development)

# 2. Configure security group
# - Inbound: PostgreSQL (5432) from your IP

# 3. Get connection string
# Format: postgresql://user:password@endpoint:5432/database
```

### Option 3: Self-Hosted (DigitalOcean, Linode)

```bash
# SSH into server
ssh root@your_server_ip

# Install PostgreSQL
apt update && apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres createdb autoshorts_db
sudo -u postgres createuser autoshorts_user -P

# Grant privileges
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE autoshorts_db TO autoshorts_user;
```

### Backup Strategy

```bash
# Weekly backup to S3
0 2 * * 0 pg_dump postgres://user:pass@host/db | gzip | \
  aws s3 cp - s3://backups/autoshorts_$(date +%Y%m%d).sql.gz
```

## Storage Setup (Cloudflare R2)

### Prerequisites
- Cloudflare account

### Steps

1. **Create Cloudflare account**
   - Sign up at [dash.cloudflare.com](https://dash.cloudflare.com)

2. **Create R2 bucket**
   - Go to R2 → Create bucket
   - Name: `autoshorts-videos`
   - Select region closest to users
   - Leave all other settings default

3. **Generate API tokens**
   - Go to R2 Settings
   - Create API token:
     - Token name: "AutoShorts API"
     - Choose "Edit" permissions for Buckets
     - Add specific bucket: `autoshorts-videos`

4. **Get credentials**
   ```bash
   Account ID: [shown in R2 dashboard]
   Access Key ID: [from API token]
   Secret Access Key: [from API token]
   Endpoint: https://<account-id>.r2.cloudflarestorage.com
   ```

5. **Configure environment variables**
   ```
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   CLOUDFLARE_ACCESS_KEY_ID=your_access_key
   CLOUDFLARE_SECRET_ACCESS_KEY=your_secret_key
   CLOUDFLARE_BUCKET_NAME=autoshorts-videos
   CLOUDFLARE_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
   ```

### Optional: Setup CDN

1. **Enable Cloudflare on domain**
   - Add domain to Cloudflare
   - Update nameservers
   - Wait for propagation (24-48 hours)

2. **Configure R2 bucket as origin**
   - Create Page Rule or Worker
   - Route: `/videos/*`
   - Origin: R2 bucket endpoint
   - Cache everything

## Environment Configuration

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Server
PORT=3000
API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Auth
JWT_SECRET=your_32_char_secret_key

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
META_APP_ID=...
META_APP_SECRET=...

# APIs
YOUTUBE_API_KEY=...

# Storage
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_ACCESS_KEY_ID=...
CLOUDFLARE_SECRET_ACCESS_KEY=...
CLOUDFLARE_BUCKET_NAME=autoshorts-videos
CLOUDFLARE_ENDPOINT=...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=noreply@yourdomain.com

# Notifications
TELEGRAM_BOT_TOKEN=...
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Post-Deployment Steps

### 1. Run Database Migrations

```bash
# Via SSH/EC2
npm run migrate:up

# Via Railway CLI
railway run npm run migrate:up
```

### 2. Test API Endpoints

```bash
# Test health endpoint
curl https://api.yourdomain.com/health

# Test registration
curl -X POST https://api.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "password123"
  }'
```

### 3. Configure OAuth

#### Google OAuth
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Set authorized redirect URIs:
   - `https://api.yourdomain.com/api/auth/google/callback`
4. Copy Client ID and Secret to environment

#### Meta OAuth
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create app → Instagram Graph API
3. Set Valid OAuth Redirect URIs:
   - `https://api.yourdomain.com/api/auth/meta/callback`
4. Copy App ID and Secret to environment

### 4. Configure n8n (Optional)

1. Deploy n8n instance
2. Import workflows from `n8n-workflows/` directory
3. Configure credentials
4. Activate workflows

### 5. Setup Monitoring

```bash
# Option 1: Sentry (Error Tracking)
npm install @sentry/node @sentry/tracing

# Option 2: Datadog (Full Monitoring)
# Install Datadog agent

# Option 3: LogRocket (Frontend)
npm install logrocket
```

### 6. Configure Email

Test email sending:

```bash
curl -X POST https://api.yourdomain.com/api/test/email \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "subject": "Test Email",
    "message": "This is a test email"
  }'
```

## SSL/HTTPS Setup

### Auto-SSL (Recommended)

- Vercel: Automatic with custom domains
- Railway: Automatic with auto-generated domain or custom domains
- Self-hosted: Use Let's Encrypt with Certbot

```bash
# Certbot setup
sudo certbot certonly --standalone -d yourdomain.com
sudo certbot renew --dry-run  # Test renewal
```

## Performance Optimization

### Frontend
- Enable Vercel Analytics
- Setup edge caching
- Use image optimization

### Backend
- Enable Redis caching
- Setup database connection pooling
- Use CDN for file delivery

### Database
- Configure backups
- Monitor slow queries
- Implement indexes on frequently queried fields

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Implement rate limiting
- [ ] Enable database backups
- [ ] Setup firewall rules
- [ ] Use environment secrets (not hardcoded)
- [ ] Enable API authentication
- [ ] Configure CSP headers
- [ ] Setup monitoring and alerts
- [ ] Regular security updates
- [ ] Implement request validation

## Troubleshooting

### Backend won't connect to database

```bash
# Test connection
psql postgresql://user:pass@host:5432/db

# Check environment variables
env | grep DATABASE

# View logs
railway logs backend
```

### Frontend can't reach backend

```bash
# Check API URL in environment
echo $NEXT_PUBLIC_API_URL

# Test API endpoint
curl https://api.yourdomain.com/health

# Check CORS settings
curl -H "Origin: https://yourdomain.com" https://api.yourdomain.com/health
```

### n8n workflows not running

```bash
# Check n8n logs
docker logs n8n

# Verify webhooks are active
# Go to n8n dashboard and check workflow status

# Test webhook
curl -X POST https://n8n.yourdomain.com/webhook/workflow-name
```

## Scaling to Production

1. **Load Balancing**: Use nginx or AWS ALB
2. **Auto-scaling**: Configure based on CPU/memory
3. **Database Replication**: Primary/Replica setup
4. **Caching**: Redis for session management
5. **CDN**: Cloudflare for static assets
6. **Monitoring**: Datadog, New Relic, or similar
7. **Backup Strategy**: Regular automated backups
8. **Disaster Recovery**: Test restore procedures

## Cost Optimization

- Vercel: $0 hobby tier, $20+/month pro
- Railway: $5+/month starter, pay-as-you-go
- PostgreSQL RDS: $10+/month micro instance
- Cloudflare R2: $0.015/GB storage, $0.015/GB download
- n8n Cloud: $30+/month

**Estimated monthly cost for production**: $50-150 depending on traffic
