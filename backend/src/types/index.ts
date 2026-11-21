export type UserRole = 'user' | 'admin' | 'suspended';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  google_id?: string | null;
  meta_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: 'youtube' | 'instagram';
  access_token: string;
  refresh_token?: string | null;
  expires_at?: Date | null;
  account_details: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Video {
  id: string;
  user_id: string;
  title: string;
  caption: string;
  hashtags: string[] | string;
  thumbnail_url?: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  duration?: number | null;
  resolution?: string | null;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
  uploaded_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Schedule {
  id: string;
  video_id: string;
  platform: 'youtube' | 'instagram' | 'both';
  publish_date: Date;
  status: 'pending' | 'published' | 'failed';
  created_at: Date;
  updated_at: Date;
}

export interface PublishLog {
  id: string;
  video_id: string;
  platform: 'youtube' | 'instagram';
  publish_url?: string | null;
  status: 'pending' | 'success' | 'failed';
  error_message?: string | null;
  retry_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'success' | 'failure' | 'warning' | 'info';
  title: string;
  message: string;
  read: boolean;
  channel: 'email' | 'telegram' | 'in-app';
  created_at: Date;
}

export interface JWTPayload {
  id: string;
  email: string;
  role?: UserRole;
  iat?: number;
  exp?: number;
}

export interface UploadProgress {
  videoId: string;
  userId?: string;
  fileName: string;
  uploadedBytes: number;
  totalBytes: number;
  progress: number;
}
