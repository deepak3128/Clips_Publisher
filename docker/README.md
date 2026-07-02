# Docker Setup Guide

## Prerequisites

- Docker and Docker Compose installed
- Git repository cloned

## Quick Start

### 1. Configure Environment

```bash
cd docker
cp .env.example .env
# Edit .env with your configuration
nano .env
```

### 2. Start Services

```bash
docker-compose up -d
```

### 3. Run Database Migrations

```bash
docker-compose exec backend npm run migrate:up
```

### 4. Access Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **n8n**: http://localhost:5678
- **Database**: localhost:5432

## Service Architecture

```
┌─────────────────┐
│    Frontend     │ (Next.js - Port 3000)
│   (Next.js)     │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐         ┌──────────────┐
│   Backend API   │────────▶│ PostgreSQL   │
│  (Node.js)      │         │ (Port 5432)  │
│  (Port 5000)    │         └──────────────┘
└────────┬────────┘
         │
         │         ┌──────────────┐
         ├────────▶│ Redis Queue  │
         │         │ (Port 6379)  │
         │         └──────────────┘
         │
         ▼
┌─────────────────┐
│   n8n Workflows │
│  (Port 5678)    │
└─────────────────┘
```

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Stop Services

```bash
docker-compose down
```

### Restart Services

```bash
docker-compose restart
```

### Run Migrations

```bash
# Run pending migrations
docker-compose exec backend npm run migrate:up

# Rollback last migration
docker-compose exec backend npm run migrate:down
```

### Access Database

```bash
docker-compose exec postgres psql -U postgres -d autoshorts_db
```

## Production Deployment

### 1. Build Images

```bash
docker build -f docker/Dockerfile.backend -t autoshorts/backend:latest .
docker build -f docker/Dockerfile.frontend -t autoshorts/frontend:latest .
```

### 2. Push to Registry

```bash
docker push autoshorts/backend:latest
docker push autoshorts/frontend:latest
```

### 3. Deploy with Docker Compose

Update `docker-compose.yml` to use pre-built images and configure production settings.

## Scaling Considerations

### Multiple Backend Instances

Use a load balancer (nginx/HAProxy) in front of multiple backend containers:

```yaml
backend-1:
  # ...
backend-2:
  # ...
nginx:
  # Load balancer configuration
```

### Database Replication

For production, configure PostgreSQL replication:
- Primary/Replica setup
- Regular backups
- Connection pooling with PgBouncer

### Storage

For production storage, use:
- Cloudflare R2 for video storage
- AWS S3 as backup
- CDN for distribution

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :5000
lsof -i :3000
lsof -i :5432

# Kill process
kill -9 <PID>
```

### Database Connection Errors

```bash
# Check database is running
docker-compose ps postgres

# Restart database
docker-compose restart postgres

# Verify connection
docker-compose exec backend npm run migrate:up
```

### n8n Workflows Not Running

```bash
# Check n8n logs
docker-compose logs n8n

# Restart n8n
docker-compose restart n8n
```

## Security Considerations

1. **Change default passwords** in `.env`
2. **Use strong JWT secret** (minimum 32 characters)
3. **Enable HTTPS** in production
4. **Use environment-specific secrets**
5. **Regularly update Docker images**
6. **Implement API rate limiting**
7. **Set up database backups**
8. **Use secrets management** (AWS Secrets Manager, Vault, etc.)

## Monitoring

### Health Checks

All services include health checks. Monitor with:

```bash
docker-compose ps
```

### Logs Monitoring

Set up centralized logging with ELK Stack or similar:

```yaml
elasticsearch:
  # ...
logstash:
  # ...
kibana:
  # ...
```

## Backup & Recovery

### Database Backup

```bash
docker-compose exec postgres pg_dump -U postgres autoshorts_db > backup.sql
```

### Database Restore

```bash
docker-compose exec -T postgres psql -U postgres autoshorts_db < backup.sql
```

### Volume Backups

```bash
docker run --rm -v autoshorts_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup.tar.gz -C /data .
```
