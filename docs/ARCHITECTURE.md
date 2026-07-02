# System Architecture

## Overview

AutoShorts Publisher is a cloud-native SaaS application with a modern, scalable architecture designed for high availability and performance.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Layer (Browser)                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │            Frontend (Next.js + React)                        │   │
│  │  ├─ Pages: Auth, Dashboard, Upload, Library, Schedule       │   │
│  │  ├─ Components: UI, DragDrop, Forms                          │   │
│  │  └─ State: Zustand, API Client                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     API Gateway / Load Balancer                       │
│                     (Nginx / AWS ALB)                                │
└─────────────────────┬───────────────────────────────────────────────┘
                      │ HTTPS
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Backend API  │ │ Backend API  │ │ Backend API  │
│  Instance 1  │ │  Instance 2  │ │  Instance N  │
│   (Express)  │ │   (Express)  │ │   (Express)  │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   ┌─────────┐  ┌──────────────┐  ┌──────────────┐
   │PostgreSQL│  │  Redis Cache │  │ File Storage │
   │ Database │  │   (Session)  │  │ (Cloudflare  │
   │          │  │              │  │      R2)     │
   └─────────┘  └──────────────┘  └──────────────┘
        │
        ▼
   ┌─────────────────────────────────────┐
   │     Database Replication (Optional)  │
   │     Backup & Recovery               │
   └─────────────────────────────────────┘

        ┌──────────────────────┐
        │    n8n Automation    │
        │  ├─ Upload Webhook   │
        │  ├─ Scheduler        │
        │  ├─ Publisher        │
        │  └─ Notifier         │
        └──────────┬───────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
   ┌─────────────┐      ┌─────────────┐
   │ YouTube API │      │ Instagram   │
   │             │      │ Graph API   │
   └─────────────┘      └─────────────┘
```

## Component Architecture

### Frontend (Next.js)

**Technologies**: React, Next.js 14, TypeScript, Tailwind CSS

**Structure**:
- App Router with nested layouts
- Server and Client Components
- API client with Axios
- State management with Zustand
- Responsive UI with Tailwind + Custom Components

**Key Features**:
- SSR for SEO optimization
- Static generation where possible
- API routes for backend integration
- Image optimization
- Error boundaries

### Backend (Node.js/Express)

**Technologies**: Node.js, Express, TypeScript, Knex.js

**Architecture Pattern**: Layered Architecture

```
Routes Layer
    ↓
Middleware Layer (Auth, Validation, Error)
    ↓
Controllers Layer (Request Handlers)
    ↓
Services Layer (Business Logic)
    ↓
Data Access Layer (Models, Database)
```

**Core Modules**:
1. **Authentication**: JWT + OAuth2 (Google, Meta)
2. **Video Management**: Upload, store, organize
3. **Scheduling**: Create, manage, execute schedules
4. **Publishing**: YouTube Shorts, Instagram Reels
5. **Notifications**: Email, Telegram
6. **Storage**: Cloudflare R2, AWS S3

### Database (PostgreSQL)

**Schema Design**:

```sql
users
├─ id (UUID)
├─ email (UNIQUE)
├─ name
├─ password (hashed)
├─ google_id
├─ meta_id

connected_accounts
├─ id (UUID)
├─ user_id (FK)
├─ platform (youtube|instagram)
├─ access_token (encrypted)
├─ refresh_token (encrypted)
├─ account_details (JSONB)

videos
├─ id (UUID)
├─ user_id (FK)
├─ title
├─ caption
├─ hashtags (JSONB array)
├─ file_url
├─ status (draft|scheduled|published|failed)
├─ uploaded_at

schedules
├─ id (UUID)
├─ video_id (FK)
├─ platform (youtube|instagram|both)
├─ publish_date
├─ status (pending|published|failed)

publish_logs
├─ id (UUID)
├─ video_id (FK)
├─ platform
├─ status (pending|success|failed)
├─ error_message
├─ retry_count

notifications
├─ id (UUID)
├─ user_id (FK)
├─ type (success|failure|warning|info)
├─ channel (email|telegram|in-app)
├─ read (boolean)
```

**Indexing**:
- users: (email), (google_id), (meta_id)
- videos: (user_id, status), (uploaded_at)
- schedules: (video_id, status), (publish_date)

### File Storage (Cloudflare R2)

**Structure**:
```
autoshorts-videos/
├─ videos/
│  ├─ {video-id}.mp4
│  ├─ {video-id}.mov
│  └─ ...
├─ thumbnails/
│  ├─ {video-id}.jpg
│  └─ ...
```

**Features**:
- S3-compatible API
- Global distribution via Cloudflare CDN
- Automatic backups
- Encryption at rest
- Versioning support

### Automation Layer (n8n)

**Workflows**:

1. **Bulk Upload Processing**
   - Triggered by: Upload webhook
   - Actions: Validate, store, generate thumbnails, send confirmation

2. **Scheduled Publishing**
   - Triggered by: Cron (every 5 minutes)
   - Actions: Check due schedules, publish to platforms, log results

3. **Failure Handling & Retry**
   - Triggered by: Cron (every 1 hour)
   - Actions: Check failed publishes, retry up to 3 times, notify on final failure

4. **Notification Handler**
   - Triggered by: Notification webhook
   - Actions: Route to channels (email, Telegram), update delivery status

## Data Flow

### Upload Flow

```
1. User selects videos in Frontend
2. Frontend validates: file type, size
3. Frontend uploads to Backend (multipart/form-data)
4. Backend validates again
5. Backend uploads to Cloudflare R2
6. Backend stores metadata in PostgreSQL
7. Backend triggers n8n webhook (bulk-upload-processing)
8. n8n processes and confirms with user
```

### Publishing Flow

```
1. User creates schedule in Frontend
2. Frontend sends schedule data to Backend
3. Backend stores schedule in PostgreSQL
4. n8n Scheduler (cron) checks for due videos
5. For each due schedule:
   a. Fetch video metadata
   b. Get connected account credentials
   c. Call YouTube/Instagram API
   d. Update publish_logs table
   e. Update schedule status
6. On success: Send confirmation email/notification
7. On failure: Log error, prepare for retry
```

### Retry Flow

```
1. n8n Failure Handler cron runs hourly
2. Queries publish_logs for failed records
3. For each failed record with retry_count < 3:
   a. Get latest account credentials
   b. Attempt to republish
   c. Update retry_count
   d. If max retries: send failure notification
```

## Security Architecture

### Authentication & Authorization

```
Browser → (HTTPS) → Backend
                     ├─ Validate JWT
                     ├─ Check user permissions
                     └─ Return user context
```

**Token Storage**:
- Frontend: localStorage (or secure cookie)
- Backend: JWT payload extraction
- Refresh: Automatic token refresh flow

### Data Protection

- **In Transit**: HTTPS/TLS everywhere
- **At Rest**: PostgreSQL encryption, S3 encryption
- **Credentials**: Encrypted in database
- **Logs**: No sensitive data in logs

### API Security

- JWT-based stateless authentication
- CORS configuration for frontend domain only
- Rate limiting per IP and user
- Request validation and sanitization
- SQL injection prevention via parameterized queries
- XSS protection via response headers (CSP)

## Scalability Considerations

### Horizontal Scaling

**Frontend**:
- Deploy multiple instances on Vercel
- CDN caching for static assets

**Backend**:
- Deploy multiple instances behind load balancer
- Stateless design (all state in DB)
- Session management via Redis

**Database**:
- Connection pooling (PgBouncer)
- Read replicas for scaling reads
- Write primary for consistency

### Vertical Scaling

- Increase server resources (RAM, CPU)
- Database instance scaling
- Cache optimization

### Performance Optimization

**Caching Strategy**:
- Frontend: Browser cache, CDN
- Backend: Redis session cache
- Database query results cache
- API response caching

**Database Optimization**:
- Query indexing
- Connection pooling
- Query optimization
- Data partitioning (if needed)

**Storage Optimization**:
- Video compression
- Thumbnail caching
- Lazy loading
- CDN delivery

## Deployment Architecture

### Development

```
Docker Compose (Local)
├─ Backend (Node.js)
├─ Frontend (Next.js)
├─ PostgreSQL
├─ Redis
└─ n8n
```

### Staging

```
Kubernetes (Optional) or Docker on VM
├─ Backend replicas
├─ Frontend (Vercel)
├─ PostgreSQL (RDS)
├─ Redis (ElastiCache)
└─ n8n (Self-hosted)
```

### Production

```
Multi-Region Deployment
├─ Frontend: Vercel (Global CDN)
├─ Backend: Railway/Render (Auto-scaling)
├─ Database: AWS RDS (Multi-AZ)
├─ Storage: Cloudflare R2
├─ Cache: Redis (Managed)
├─ n8n: Self-hosted or managed
└─ Monitoring: Sentry, Datadog, LogRocket
```

## Monitoring & Observability

### Logging

- **Backend Logs**: Pino (structured JSON)
- **Frontend Logs**: LogRocket (session replay)
- **Centralized**: ELK Stack or similar

### Metrics

- API request latency
- Database query performance
- Cache hit rates
- Video upload/publish success rates
- Error rates
- User engagement

### Alerting

- CPU/Memory threshold alerts
- Database connection issues
- API error rates
- Publishing failures
- Storage quota warnings

## Disaster Recovery

### Backup Strategy

```
Database:
├─ Hourly incremental backups
├─ Daily full backups
├─ Weekly archive to S3
└─ 30-day retention

Files:
├─ Versioning enabled in R2
├─ Cross-region replication (Optional)
└─ Archive older files
```

### Recovery Time Objectives (RTO)

- Database: < 1 hour
- API: < 5 minutes
- Storage: < 1 hour
- Frontend: < 5 minutes

### Recovery Point Objectives (RPO)

- Database: 1 hour
- Files: No data loss (versioning)

## Future Enhancements

1. **Global CDN**: Multi-region deployment
2. **Machine Learning**: Auto-caption, hashtag generation
3. **Analytics**: Deep analytics dashboard
4. **Mobile Apps**: Native iOS/Android
5. **Webhooks**: Custom user webhooks
6. **Plugins**: Extensibility platform
7. **Team Collaboration**: Multi-user teams
8. **Advanced Scheduling**: ML-based optimal times
