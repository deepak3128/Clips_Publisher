# AutoShorts Publisher Backend API

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update environment variables in `.env`

4. Run migrations:
```bash
npm run migrate:up
```

5. Start development server:
```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run migrate:up` - Run database migrations
- `npm run migrate:down` - Rollback migrations
- `npm run migrate:make` - Create new migration
- `npm run lint` - Run linter
- `npm run format` - Format code with Prettier

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (requires auth)
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/meta/callback` - Meta OAuth callback

### Videos
- `POST /api/videos/upload` - Upload videos (multipart/form-data)
- `GET /api/videos` - List user videos
- `GET /api/videos/:videoId` - Get video details
- `PATCH /api/videos/:videoId` - Update video
- `DELETE /api/videos/:videoId` - Delete video
- `GET /api/videos/stats` - Get dashboard statistics

### Schedules
- `POST /api/schedules` - Create schedules
- `POST /api/schedules/bulk` - Bulk schedule videos
- `GET /api/schedules/video/:videoId` - Get video schedules
- `DELETE /api/schedules/:scheduleId` - Delete schedule

### Connected Accounts
- `POST /api/accounts/connect` - Connect social account
- `GET /api/accounts` - List connected accounts
- `DELETE /api/accounts/:accountId` - Disconnect account
