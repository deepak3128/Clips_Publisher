# Clips Publisher

A Next.js + Express application for turning a YouTube link, a public video URL, or a locally uploaded video into short clips with automatically generated captions. Each finished clip can be downloaded or published to YouTube Shorts / Instagram Reels.

## What it does

1. Provide a source video (local upload, YouTube link, or public MP4 URL).
2. Choose how many clips to make and how captions should look (font, size, colour, bold, italic, position).
3. The backend finds the most active moments, transcribes speech with Whisper, renders each clip with burned-in captions, and reports progress.
4. Download the clips individually or publish them to connected social accounts.

The older bulk-upload, scheduling, admin, and n8n features remain in the codebase; the clip publisher is now the primary flow at `/clips`.

## Features

- Clip source support: local file upload, YouTube URL, and direct public video URL
- Highlight-based clipping using silence and scene-change detection
- Automatic speech transcription and timed caption rendering via Whisper
- Caption styling: font, size, colour, bold, italic, and top/bottom placement
- Clip job tracking with progress polling
- Download rendered MP4 clips
- Publish clips to YouTube Shorts or Instagram Reels
- User accounts, roles, and admin controls
- Optional n8n workflows for automation

## Stack

### Frontend

- Next.js 14 (App Router), TypeScript
- Tailwind CSS and Radix UI primitives
- Zustand for state, Axios for API calls

### Backend

- Node.js 18+, Express, TypeScript
- PostgreSQL with Knex.js
- JWT authentication and OAuth callbacks
- BullMQ/Redis for upload jobs (optional)
- ffmpeg-static / ffprobe-static for video processing
- @distube/ytdl-core for YouTube downloads
- OpenAI Whisper for transcription
- Cloudflare R2 or AWS S3 for optional clip storage

## Project structure

```text
autoshorts-publisher/
├── backend/
│   ├── database/migrations/     # Schema migrations
│   ├── database/seeds/          # Demo data
│   └── src/
│       ├── config/              # Environment configuration
│       ├── controllers/         # HTTP handlers
│       ├── middleware/          # Auth, admin, errors
│       ├── routes/              # API route definitions
│       ├── services/            # clip, publish, queue, admin, etc.
│       ├── types/               # Shared TypeScript types
│       └── utils/               # db, storage, email, jwt, n8n, telegram
├── frontend/
│   ├── app/
│   │   ├── clips/               # Clip publisher wizard
│   │   ├── admin/               # Admin dashboard
│   │   ├── auth/                # Login and registration
│   │   └── ...                  # Dashboard, library, schedule, upload, etc.
│   ├── components/              # Shared UI components
│   ├── hooks/                   # useAuth and helpers
│   ├── lib/                     # API client and auth store
│   └── types/                   # Shared TypeScript types
├── docker/                      # Optional Docker Compose setup
├── docs/                        # API, deployment, architecture docs
└── n8n-workflows/               # Optional automation workflows
```

## Prerequisites

- Node.js 18 or newer
- PostgreSQL 14 or newer
- Redis (optional; set `REDIS_ENABLED=false` to run without it)
- An OpenAI API key for auto captions
- Connected YouTube / Instagram accounts for publishing

ffmpeg, ffprobe, and YouTube download support are installed through npm dependencies; you do not need to install those binaries system-wide.

## Local development

### 1. Clone and install

```bash
git clone https://github.com/deepak3128/Clips_Publisher.git
cd Clips_Publisher

cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Set at minimum:

- `DATABASE_URL` (or the individual `DB_*` values)
- `JWT_SECRET`
- `API_TOKEN` (shared token for n8n/service calls)
- `OPENAI_API_KEY` (auto captions)

Then run migrations and optional demo seed data:

```bash
npm run migrate:up
npm run seed
```

Start the API:

```bash
npm run dev
```

The backend runs at `http://localhost:5000`.

### 3. Configure the frontend

```bash
cd frontend
cp .env.example .env.local
```

Set `NEXT_PUBLIC_API_URL` to your backend URL, then start it:

```bash
npm run dev
```

The frontend runs at `http://localhost:3000`. Log in, then open `/clips`.

Demo account after seeding: `demo@autoshorts.com` / `password123`.

## Environment variables

### Backend

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` / `DB_*` | PostgreSQL connection |
| `JWT_SECRET`, `JWT_EXPIRY` | JWT signing |
| `API_TOKEN` | Shared token for n8n/service endpoints |
| `REDIS_ENABLED`, `REDIS_HOST`, `REDIS_PORT` | Upload queue |
| `CLIPS_DIR`, `CLIPS_PUBLIC_URL`, `MAX_CLIP_DURATION_SECONDS` | Clip output and download URLs |
| `OPENAI_API_KEY`, `OPENAI_TRANSCRIPTION_MODEL` | Whisper transcription |
| `GOOGLE_CLIENT_*`, `META_APP_*`, `YOUTUBE_API_KEY` | OAuth and platform APIs |
| `CLOUDFLARE_*` or `AWS_*` | Optional object storage |
| `SMTP_*`, `TELEGRAM_BOT_TOKEN` | Notifications |
| `N8N_URL`, `N8N_API_KEY` | Optional n8n webhooks |

See `backend/.env.example` for the full list.

### Frontend

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth (optional UI) |
| `NEXT_PUBLIC_META_APP_ID` | Meta OAuth (optional UI) |
| `NEXT_PUBLIC_MAX_CLIP_SECONDS` | Displayed clip length limit |

## API

The full API reference lives in [docs/API.md](docs/API.md). The main clip endpoints are:

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/clips/upload` | Create a job from a local video |
| POST | `/api/clips/url` | Create a job from a YouTube or public URL |
| GET | `/api/clips/jobs` | List recent jobs |
| GET | `/api/clips/jobs/:jobId` | Job status and progress |
| GET | `/api/clips/jobs/:jobId/clips` | Rendered clips |
| POST | `/api/clips/:clipId/publish` | Publish a clip to YouTube or Instagram |

## Scripts

### Backend

```bash
npm run dev          # Development server
npm run build        # TypeScript build
npm run start        # Run built output
npm run lint         # ESLint
npm run migrate:up   # Apply migrations
npm run migrate:down # Roll back last migration
npm run seed         # Seed demo data
```

### Frontend

```bash
npm run dev     # Development server
npm run build   # Production build
npm run start   # Serve production build
npm run lint    # ESLint
```

There are no automated test scripts yet.

## Docker

An optional Docker Compose setup is in `docker/`:

```bash
cd docker
cp .env.example .env
docker compose up -d
docker compose exec backend npm run migrate:up
```

This starts PostgreSQL, Redis, the backend, the frontend, and n8n.

## Notes

- Auto captions require `OPENAI_API_KEY`. Without it, clips are rendered without captions.
- YouTube downloading uses `@distube/ytdl-core`; some videos may fail because of YouTube anti-bot controls.
- Publishing needs connected social accounts and a publicly reachable `CLIPS_PUBLIC_URL` or configured R2/S3 storage.
- n8n workflows are optional and are not required for the clip publisher.
