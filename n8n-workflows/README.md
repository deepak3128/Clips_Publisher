# n8n Workflows

This directory contains n8n workflow definitions for AutoShorts Publisher automation.

## Workflows

### 1. Bulk Upload Processing (`bulk-upload-processing.json`)
Processes uploaded videos when users submit bulk uploads through the API.

**Flow:**
1. Webhook receives upload event
2. Sends data to backend API
3. Saves video metadata to database
4. Sends confirmation email to user

**Triggers:** Webhook (HTTP POST)

### 2. Scheduled Publishing (`scheduled-publishing.json`)
Automatically publishes videos to YouTube and Instagram at scheduled times.

**Flow:**
1. Cron trigger checks every 5 minutes
2. Fetches videos due for publishing
3. Loops through each schedule
4. Publishes to YouTube Shorts
5. Publishes to Instagram Reels
6. Updates schedule status

**Triggers:** Cron (every 5 minutes)

### 3. Failure Handling & Retry (`failure-handling-retry.json`)
Monitors failed publish attempts and automatically retries up to 3 times.

**Flow:**
1. Cron trigger checks every hour
2. Fetches failed publish logs
3. Checks retry count
4. If retry count < 3, attempts republish
5. If max retries exceeded, sends failure notification

**Triggers:** Cron (every hour)

### 4. Notification Handler (`notification-handler.json`)
Routes notifications to appropriate channels (Email, Telegram, In-App).

**Flow:**
1. Webhook receives notification event
2. Routes by channel type
3. Sends email or Telegram message
4. Logs notification in database

**Triggers:** Webhook (HTTP POST)

## Setup

### Prerequisites
- n8n instance running (v0.187.0+)
- API credentials configured as n8n credentials
- Email service configured (SMTP)
- Telegram bot token (if using Telegram)

### Installation

1. Open n8n UI at `http://localhost:5678`

2. Create credentials:
   - PostgreSQL: Database connection
   - HTTP Bearer Auth: API token
   - Email: SMTP credentials
   - Telegram: Bot token

3. Import workflows:
   - Click `Import` button
   - Select workflow JSON file
   - Configure credentials
   - Activate workflow

### Environment Variables in n8n

Set these in n8n Dashboard Settings:

```
API_URL=http://localhost:5000
API_TOKEN=your_api_token
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

## Webhook Endpoints

### Upload Processing
```
POST http://localhost:5678/webhook/upload-webhook
Content-Type: application/json

{
  "email": "user@example.com",
  "videos": [...]
}
```

### Notifications
```
POST http://localhost:5678/webhook/notifications
Content-Type: application/json

{
  "id": "notification-id",
  "channel": "email|telegram|in-app",
  "email": "user@example.com",
  "title": "Notification Title",
  "message": "Notification message",
  "telegram_chat_id": "123456"
}
```

## Troubleshooting

- Check n8n logs for error details
- Verify API endpoints are accessible
- Test credentials individually
- Check database connectivity
- Verify email/Telegram service configuration
