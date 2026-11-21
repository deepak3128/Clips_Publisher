export type UserRole = 'user' | 'admin' | 'suspended';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Video {
  id: string;
  title: string;
  caption: string;
  hashtags: string[] | string;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  uploaded_at?: string;
  // Kept for compatibility with camelCase API representations.
  fileUrl?: string;
  fileName?: string;
}

export interface Schedule {
  id: string;
  video_id: string;
  platform: 'youtube' | 'instagram' | 'both';
  publish_date: string;
  status: 'pending' | 'published' | 'failed';
}

export interface ConnectedAccount {
  id: string;
  platform: 'youtube' | 'instagram';
  account_details?: Record<string, any>;
  accountDetails?: Record<string, any>;
}

export interface DashboardStats {
  total: number;
  scheduled: number;
  published: number;
  failed: number;
}

export interface ClipSettings {
  clipCount: number;
  font: string;
  fontSize: number;
  fontColor: string;
  bold: boolean;
  italic: boolean;
  position: 'top' | 'bottom';
  autoCaptions: boolean;
  captionText?: string;
}

export interface ClipJob {
  id: string;
  source_type: 'upload' | 'youtube' | 'url';
  source_value: string;
  file_name: string | null;
  clip_count: number;
  settings: ClipSettings;
  status: string;
  progress: number;
  error_message: string | null;
  created_at: string;
}

export interface Clip {
  id: string;
  job_id: string;
  clip_index: number;
  title: string;
  start_time: number;
  end_time: number;
  duration: number;
  file_name: string;
  file_url: string;
  status: string;
}
