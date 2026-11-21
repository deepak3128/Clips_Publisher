# AutoShorts Publisher

A production-ready SaaS platform for uploading multiple short-form videos in bulk and automatically publishing them to YouTube Shorts and Instagram Reels based on predefined schedules.

## Features

✨ **Core Features**

- ✂️ **Clip Publisher** - Turn a YouTube link, public URL, or local video into smart clips with auto captions, then download or publish them
- 🎥 **Bulk Video Upload** - Upload 50+ videos simultaneously with drag-and-drop interface
- 📅 **Smart Scheduling** - Fixed interval, custom dates, or bulk scheduling with multiple posts per day
- 🚀 **Multi-Platform Publishing** - Auto-publish to YouTube Shorts and Instagram Reels
- 📊 **Analytics Dashboard** - Real-time statistics and publishing metrics
- 🔄 **Automatic Retries** - Failed uploads retry up to 3 times automatically
- 📧 **Notifications** - Email and Telegram alerts for upload/publish events
- 🔐 **OAuth Integration** - Google and Meta OAuth for seamless authentication
- 💾 **Cloud Storage** - Cloudflare R2 or AWS S3 integration
- ⚡ **n8n Automation** - Workflow automation for bulk operations

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom components
- **State Management**: Zustand
- **HTTP Client**: Axios
- **UI Components**: Custom + Shadcn/ui patterns

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express
- **Language**: TypeScript
- **Database**: PostgreSQL 14+
- **ORM**: Knex.js
- **Authentication**: JWT + OAuth
- **File Storage**: Cloudflare R2 / AWS S3
- **Email**: Nodemailer
- **Logging**: Pino

### Automation & DevOps
- **Automation**: n8n
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL
- **Queue**: Redis
- **Cache**: Redis
- **APIs**: YouTube Data API v3, Meta Graph API

### Deployment
- **Frontend**: Vercel
- **Backend**: Railway / Render
- **Database**: Railway PostgreSQL / AWS RDS
- **Storage**: Cloudflare R2

## Project Structure

```
autoshorts-publisher/
├── backend/                    # Node.js Express API
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Express middleware
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # Utilities (db, storage, email, jwt)
│   │   ├── app.ts             # Express app setup
│   │   └── index.ts           # Entry point
│   ├── database/
│   │   └── migrations/        # Database migrations
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── frontend/                   # Next.js React Application
│   ├── app/                    # App Router pages
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Dashboard
│   │   ├── upload/            # Video upload
│   │   ├── library/           # Video library
│   │   ├── schedule/          # Scheduling
│   │   ├── accounts/          # Social accounts
│   │   ├── settings/          # Settings
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── ui/                # UI components
│   │   ├── Layout.tsx
│   │   └── DragDropArea.tsx
│   ├── hooks/                 # Custom hooks
│   ├── lib/                   # Utilities & API client
│   ├── types/                 # TypeScript types
│   ├── public/                # Static assets
│   ├── package.json
│   └── README.md
│
├── n8n-workflows/             # n8n automation workflows
│   ├── bulk-upload-processing.json
│   ├── scheduled-publishing.json
│   ├── failure-handling-retry.json
│   ├── notification-handler.json
│   └── README.md
│
├── docker/                    # Docker configuration
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── docker-compose.yml
│   ├── .env.example
│   └── README.md
│
├── docs/                      # Documentation
│   ├── DEPLOYMENT.md          # Deployment guide
│   ├── API.md                 # API documentation
│   └── ARCHITECTURE.md        # System architecture
│
└── README.md                  # This file
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for containerized setup)
- PostgreSQL 14+ (if not using Docker)
- Git

### Local Development

#### 1. Clone Repository

```bash
git clone https://github.com/yourusername/autoshorts-publisher.git
cd autoshorts-publisher
```

#### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run migrations
npm run migrate:up

# Start development server
npm run dev
```

Backend will be available at `http://localhost:5000`

#### 3. Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local

# Edit .env.local
nano .env.local

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

#### 4. Optional: Setup n8n

```bash
docker pull n8nio/n8n
docker run -it -p 5678:5678 n8nio/n8n
```

n8n will be available at `http://localhost:5678`

### Docker Setup

```bash
cd docker

# Create .env file
cp .env.example .env

# Edit configuration
nano .env

# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend npm run migrate:up

# Check status
docker-compose ps
```

Access services:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- n8n: http://localhost:5678
- PostgreSQL: localhost:5432

## API Documentation

### Authentication

```bash
# Register
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "password123"
}

# Response
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt_token"
}
```

### Videos

```bash
# Upload videos
POST /api/videos/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}

files: [video1.mp4, video2.mp4, ...]

# Get videos
GET /api/videos?status=draft&limit=20&offset=0
Authorization: Bearer {token}

# Get dashboard stats
GET /api/videos/stats
Authorization: Bearer {token}
```

### Scheduling

```bash
# Bulk schedule
POST /api/schedules/bulk
Content-Type: application/json
Authorization: Bearer {token}

{
  "videoIds": ["id1", "id2"],
  "platform": "both",
  "startDate": "2024-01-01",
  "postsPerDay": 2,
  "postingTimes": ["10:00", "20:00"]
}
```

### Social Accounts

```bash
# Get connected accounts
GET /api/accounts
Authorization: Bearer {token}

# Connect YouTube
POST /api/accounts/connect
Content-Type: application/json
Authorization: Bearer {token}

{
  "platform": "youtube",
  "accessToken": "...",
  "accountDetails": {...}
}
```

See [API.md](docs/API.md) for complete documentation.

## Configuration

### Environment Variables

#### Backend

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `API_TOKEN` - Shared token used by n8n to call publish/schedule endpoints
- `REDIS_ENABLED` / `REDIS_HOST` / `REDIS_PORT` - Upload queue (set `REDIS_ENABLED=false` to run without Redis)
- `CLIPS_DIR` / `CLIPS_PUBLIC_URL` / `MAX_CLIP_DURATION_SECONDS` - Clip rendering output and download URLs
- `OPENAI_API_KEY` / `OPENAI_TRANSCRIPTION_MODEL` - Whisper transcription for auto captions
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `META_APP_ID` / `META_APP_SECRET` - Meta OAuth
- `YOUTUBE_API_KEY` - YouTube Data API key
- `CLOUDFLARE_*` - Cloudflare R2 credentials
- `SMTP_*` - Email SMTP configuration
- `TELEGRAM_BOT_TOKEN` - Telegram bot token

#### Frontend

- `NEXT_PUBLIC_API_URL` - Backend API URL

See `.env.example` files for complete list.

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  meta_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Videos Table
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  caption TEXT,
  hashtags JSONB DEFAULT '[]',
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  status ENUM ('draft', 'scheduled', 'publishing', 'published', 'failed'),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

See migrations in `backend/database/migrations/` for complete schema.

## Deployment

### Quick Deploy

#### Frontend to Vercel
```bash
npm i -g vercel
cd frontend
vercel
```

#### Backend to Railway
1. Connect GitHub repo to Railway
2. Add PostgreSQL addon
3. Set environment variables
4. Deploy

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

## n8n Workflows

Included automation workflows:

1. **Bulk Upload Processing** - Processes uploaded videos
2. **Scheduled Publishing** - Publishes videos at scheduled times
3. **Failure Handling** - Retries failed uploads
4. **Notification Handler** - Routes notifications to channels

Import workflows from `n8n-workflows/` directory.

## Development

### Running Tests

```bash
cd backend
npm test

cd ../frontend
npm test
```

### Code Quality

```bash
# Linting
npm run lint

# Formatting
npm run format
```

### Building for Production

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

## Performance Optimization

### Frontend
- Next.js Image Optimization
- Code splitting
- Dynamic imports
- Caching strategies

### Backend
- Database connection pooling
- Redis caching
- Request rate limiting
- Efficient file uploads

### Database
- Proper indexing
- Query optimization
- Connection pooling with PgBouncer

## Security

- JWT-based authentication
- OAuth 2.0 integration
- HTTPS enforced
- CORS configuration
- SQL injection prevention
- XSS protection
- CSRF tokens
- Rate limiting
- Secure password hashing (bcrypt)
- Encrypted token storage

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## Support

For support, email support@autoshorts.com or open an issue on GitHub.

## Roadmap

- [ ] TikTok integration
- [ ] LinkedIn video support
- [ ] AI caption generation
- [ ] Auto hashtag suggestions
- [ ] Analytics dashboard enhancements
- [ ] Team collaboration features
- [ ] White-label SaaS version
- [ ] Mobile apps (iOS/Android)

## Acknowledgments

- YouTube Data API
- Meta Graph API
- Cloudflare R2
- n8n community
- Open source contributors

---

**Built with ❤️ for content creators**

Made with Next.js, Express, PostgreSQL, and n8n
