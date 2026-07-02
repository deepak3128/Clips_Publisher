# AutoShorts Publisher Frontend

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
cp .env.example .env.local
```

3. Update the API URL in `.env.local` to match your backend

4. Start development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run linter

## Project Structure

- `app/` - Next.js app pages
- `components/` - React components
- `lib/` - Utility functions and API client
- `hooks/` - Custom React hooks
- `types/` - TypeScript type definitions
- `public/` - Static assets

## Pages

- `/` - Home/Redirect
- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/dashboard` - Dashboard with statistics
- `/upload` - Bulk video upload
- `/library` - Video library with filters
- `/schedule` - Video scheduling
- `/accounts` - Connected social accounts
- `/settings` - User settings

## Features

- User authentication (Email & OAuth)
- Bulk video upload with drag-and-drop
- Video library management
- Flexible scheduling options
- Social account management
- Real-time notifications
- Responsive design
