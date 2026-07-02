export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  googleId?: string;
  metaId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectedAccount {
  id: string;
  userId: string;
  platform: 'youtube' | 'instagram';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  accountDetails: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Video {
  id: string;
  userId: string;
  title: string;
  caption: string;
  hashtags: string[];
  thumbnailUrl?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  duration?: number;
  resolution?: string;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Schedule {
  id: string;
  videoId: string;
  platform: 'youtube' | 'instagram' | 'both';
  publishDate: Date;
  status: 'pending' | 'published' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishLog {
  id: string;
  videoId: string;
  platform: 'youtube' | 'instagram';
  publishUrl?: string;
  status: 'pending' | 'success' | 'failed';
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'success' | 'failure' | 'warning' | 'info';
  title: string;
  message: string;
  read: boolean;
  channel: 'email' | 'telegram' | 'in-app';
  createdAt: Date;
}

export interface JWTPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface UploadProgress {
  videoId: string;
  fileName: string;
  uploadedBytes: number;
  totalBytes: number;
  progress: number;
}
