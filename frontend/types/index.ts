export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Video {
  id: string;
  title: string;
  caption: string;
  hashtags: string[];
  fileUrl: string;
  fileName: string;
  fileSize: number;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
  uploadedAt: string;
}

export interface Schedule {
  id: string;
  videoId: string;
  platform: 'youtube' | 'instagram' | 'both';
  publishDate: string;
  status: 'pending' | 'published' | 'failed';
}

export interface ConnectedAccount {
  id: string;
  platform: 'youtube' | 'instagram';
  accountDetails: Record<string, any>;
}

export interface DashboardStats {
  total: number;
  scheduled: number;
  published: number;
  failed: number;
}
