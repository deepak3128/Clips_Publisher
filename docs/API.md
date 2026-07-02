# API Documentation

## Base URL

```
https://api.yourdomain.com/api
```

## Authentication

All endpoints require JWT token in Authorization header:

```
Authorization: Bearer {token}
```

Tokens are obtained from `/auth/register` or `/auth/login` endpoints.

---

## Authentication Endpoints

### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "password123"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login User

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get Profile

```http
GET /auth/profile
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe"
}
```

---

## Video Endpoints

### Upload Videos

```http
POST /videos/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}

videos: [file1.mp4, file2.mp4, ...]
```

**Response:** `201 Created`
```json
{
  "videos": [
    {
      "id": "video-id-1",
      "userId": "user-id",
      "title": "video1.mp4",
      "caption": "",
      "hashtags": [],
      "fileUrl": "https://r2.example.com/videos/video-id-1.mp4",
      "fileName": "video1.mp4",
      "fileSize": 104857600,
      "status": "draft",
      "uploadedAt": "2024-01-01T12:00:00Z",
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Get Videos

```http
GET /videos?status=draft&limit=20&offset=0
Authorization: Bearer {token}
```

**Query Parameters:**
- `status` (optional): draft | scheduled | published | failed
- `limit` (optional): Max results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:** `200 OK`
```json
{
  "videos": [...],
  "total": 150
}
```

### Get Video Details

```http
GET /videos/:videoId
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "id": "video-id",
  "userId": "user-id",
  "title": "My Video",
  "caption": "This is my video",
  "hashtags": ["gaming", "trending"],
  "fileUrl": "https://r2.example.com/videos/video-id.mp4",
  "fileName": "video.mp4",
  "fileSize": 104857600,
  "status": "scheduled",
  "uploadedAt": "2024-01-01T12:00:00Z",
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

### Update Video

```http
PATCH /videos/:videoId
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "Updated Title",
  "caption": "Updated caption",
  "hashtags": ["new", "hashtags"]
}
```

**Response:** `200 OK` (same as Get Video Details)

### Delete Video

```http
DELETE /videos/:videoId
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "message": "Video deleted"
}
```

### Get Upload Progress

```http
GET /videos/upload-progress/:videoId
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "videoId": "video-id",
  "fileName": "video.mp4",
  "uploadedBytes": 52428800,
  "totalBytes": 104857600,
  "progress": 50
}
```

### Get Dashboard Stats

```http
GET /videos/stats
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "total": 100,
  "scheduled": 25,
  "published": 50,
  "failed": 5
}
```

---

## Schedule Endpoints

### Create Schedules

```http
POST /schedules
Content-Type: application/json
Authorization: Bearer {token}

{
  "videoIds": ["video-id-1", "video-id-2"],
  "platform": "both",
  "publishDates": [
    "2024-01-05T10:00:00Z",
    "2024-01-06T10:00:00Z"
  ]
}
```

**Response:** `201 Created`
```json
{
  "schedules": [
    {
      "id": "schedule-id-1",
      "videoId": "video-id-1",
      "platform": "both",
      "publishDate": "2024-01-05T10:00:00Z",
      "status": "pending",
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Bulk Schedule Videos

```http
POST /schedules/bulk
Content-Type: application/json
Authorization: Bearer {token}

{
  "videoIds": ["video-id-1", "video-id-2", ..., "video-id-50"],
  "platform": "both",
  "startDate": "2024-01-05",
  "postsPerDay": 2,
  "postingTimes": ["10:00", "20:00"]
}
```

**Description:** Automatically schedules multiple videos with specified frequency.

**Response:** `201 Created`
```json
{
  "schedules": [...]
}
```

### Get Schedules for Video

```http
GET /schedules/video/:videoId
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "schedules": [
    {
      "id": "schedule-id",
      "videoId": "video-id",
      "platform": "youtube",
      "publishDate": "2024-01-05T10:00:00Z",
      "status": "pending",
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Delete Schedule

```http
DELETE /schedules/:scheduleId
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "message": "Schedule deleted"
}
```

---

## Social Account Endpoints

### Connect Social Account

```http
POST /accounts/connect
Content-Type: application/json
Authorization: Bearer {token}

{
  "platform": "youtube",
  "accessToken": "access_token_from_oauth",
  "refreshToken": "refresh_token_from_oauth",
  "expiresAt": "2024-02-01T12:00:00Z",
  "accountDetails": {
    "id": "channel-id",
    "name": "My Channel",
    "email": "channel@gmail.com"
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "account-id",
  "userId": "user-id",
  "platform": "youtube",
  "accessToken": "access_token_from_oauth",
  "refreshToken": "refresh_token_from_oauth",
  "expiresAt": "2024-02-01T12:00:00Z",
  "accountDetails": {
    "id": "channel-id",
    "name": "My Channel",
    "email": "channel@gmail.com"
  },
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

### Get Connected Accounts

```http
GET /accounts
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "accounts": [
    {
      "id": "account-id-1",
      "platform": "youtube",
      "accountDetails": {...}
    },
    {
      "id": "account-id-2",
      "platform": "instagram",
      "accountDetails": {...}
    }
  ]
}
```

### Disconnect Account

```http
DELETE /accounts/:accountId
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "message": "Account disconnected"
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Validation failed",
  "details": ["Email is invalid", "Password must be at least 8 characters"]
}
```

### 401 Unauthorized

```json
{
  "error": "Invalid token"
}
```

### 403 Forbidden

```json
{
  "error": "You don't have permission to access this resource"
}
```

### 404 Not Found

```json
{
  "error": "Video not found"
}
```

### 409 Conflict

```json
{
  "error": "User already exists"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

All endpoints are rate limited:

- **Default**: 100 requests per 15 minutes
- **Login**: 5 requests per 15 minutes
- **Upload**: 10 requests per 15 minutes

Rate limit info is returned in headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

## Pagination

List endpoints support pagination via query parameters:

```
GET /videos?limit=20&offset=0
GET /videos?limit=20&offset=20
GET /videos?limit=20&offset=40
```

**Response includes**:
- `data`: Array of items
- `total`: Total item count
- `limit`: Items per page
- `offset`: Current offset

---

## Sorting

Some list endpoints support sorting:

```
GET /videos?sort=-createdAt    # Descending by created_at
GET /videos?sort=title         # Ascending by title
```

---

## Filtering

Supported filters vary by endpoint. Common filters:

```
GET /videos?status=published
GET /videos?status=draft,scheduled
GET /videos?platform=youtube
```

---

## Webhooks

Incoming webhooks for n8n workflows:

### Upload Webhook

```http
POST /webhook/upload-webhook
Content-Type: application/json

{
  "event": "video.uploaded",
  "videoIds": ["id1", "id2"],
  "userId": "user-id",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Notification Webhook

```http
POST /webhook/notifications
Content-Type: application/json

{
  "event": "publish.success",
  "videoId": "video-id",
  "platform": "youtube",
  "url": "https://youtube.com/shorts/...",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## SDK Usage (TypeScript/JavaScript)

```typescript
import { apiClient } from '@/lib/api';

// Register
const { user, token } = await apiClient.register(
  'user@example.com',
  'John Doe',
  'password123'
);

// Upload videos
const videos = await apiClient.uploadVideos([file1, file2]);

// Get videos
const { videos, total } = await apiClient.getVideos('draft', 20, 0);

// Schedule videos
const schedules = await apiClient.bulkScheduleVideos(
  videoIds,
  'both',
  '2024-01-05',
  2,
  ['10:00', '20:00']
);

// Get connected accounts
const { accounts } = await apiClient.getConnectedAccounts();
```

---

## Changelog

### v1.0.0 (2024-01-01)
- Initial release
- Core features: upload, schedule, publish
- OAuth integration
- Dashboard and statistics
