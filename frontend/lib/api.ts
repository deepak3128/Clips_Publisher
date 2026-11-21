import axios, { AxiosInstance } from 'axios';
import type { ClipSettings } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface UploadMetadata {
  title?: string;
  caption?: string;
  hashtags?: string[] | string;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Auth endpoints
  async register(email: string, name: string, password: string) {
    return this.client.post('/auth/register', { email, name, password });
  }

  async login(email: string, password: string) {
    return this.client.post('/auth/login', { email, password });
  }

  async getProfile() {
    return this.client.get('/auth/profile');
  }

  // Video endpoints
  async uploadVideos(
    files: File[],
    metadata: UploadMetadata = {},
    onProgress?: (progress: number) => void,
  ) {
    const formData = new FormData();
    files.forEach((file) => formData.append('videos', file));

    if (metadata.title) formData.append('title', metadata.title);
    if (metadata.caption) formData.append('caption', metadata.caption);
    if (metadata.hashtags) {
      const hashtags = Array.isArray(metadata.hashtags)
        ? metadata.hashtags.join(' ')
        : metadata.hashtags;
      formData.append('hashtags', hashtags);
    }

    return this.client.post('/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });
  }

  async getUploadProgress(videoId: string) {
    return this.client.get(`/videos/upload-progress/${videoId}`);
  }

  async getVideos(status?: string, limit = 20, offset = 0) {
    return this.client.get('/videos', {
      params: { status, limit, offset },
    });
  }

  async getVideo(videoId: string) {
    return this.client.get(`/videos/${videoId}`);
  }

  async updateVideo(videoId: string, data: { title?: string; caption?: string; hashtags?: string[] }) {
    return this.client.patch(`/videos/${videoId}`, data);
  }

  async deleteVideo(videoId: string) {
    return this.client.delete(`/videos/${videoId}`);
  }

  async getDashboardStats() {
    return this.client.get('/videos/stats');
  }

  // Schedule endpoints
  async createSchedules(videoIds: string[], platform: string, publishDates: string[]) {
    return this.client.post('/schedules', { videoIds, platform, publishDates });
  }

  async bulkScheduleVideos(videoIds: string[], platform: string, startDate: string, postsPerDay: number, postingTimes: string[]) {
    return this.client.post('/schedules/bulk', { videoIds, platform, startDate, postsPerDay, postingTimes });
  }

  async getSchedules(videoId: string) {
    return this.client.get(`/schedules/video/${videoId}`);
  }

  // Connected accounts endpoints
  async getConnectedAccounts() {
    return this.client.get('/accounts');
  }

  async connectAccount(platform: string, accessToken: string, accountDetails: Record<string, any>) {
    return this.client.post('/accounts/connect', { platform, accessToken, accountDetails });
  }

  async disconnectAccount(accountId: string) {
    return this.client.delete(`/accounts/${accountId}`);
  }

  // Admin endpoints
  async getAdminStats() {
    return this.client.get('/admin/stats');
  }

  async getAdminUsers(page = 1, limit = 20) {
    return this.client.get('/admin/users', { params: { page, limit } });
  }

  async suspendUser(userId: string) {
    return this.client.post(`/admin/users/${userId}/suspend`);
  }

  async unsuspendUser(userId: string) {
    return this.client.post(`/admin/users/${userId}/unsuspend`);
  }

  async getAdminPublishLogs(page = 1, limit = 20) {
    return this.client.get('/admin/publish-logs', { params: { page, limit } });
  }

  async retryPublish(logId: string) {
    return this.client.post(`/admin/publish-logs/${logId}/retry`);
  }

  // Clip publisher endpoints
  async createClipFromUpload(file: File, settings: ClipSettings, onProgress?: (progress: number) => void) {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('clipCount', String(settings.clipCount));
    formData.append('font', settings.font);
    formData.append('fontSize', String(settings.fontSize));
    formData.append('fontColor', settings.fontColor);
    formData.append('bold', String(settings.bold));
    formData.append('italic', String(settings.italic));
    formData.append('position', settings.position);
    formData.append('autoCaptions', String(settings.autoCaptions));
    if (settings.captionText) formData.append('captionText', settings.captionText);

    return this.client.post('/clips/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });
  }

  async createClipFromUrl(url: string, settings: ClipSettings) {
    return this.client.post('/clips/url', { url, ...settings });
  }

  async getClipJobs() {
    return this.client.get('/clips/jobs');
  }

  async getClipJob(jobId: string) {
    return this.client.get(`/clips/jobs/${jobId}`);
  }

  async getClips(jobId: string) {
    return this.client.get(`/clips/jobs/${jobId}/clips`);
  }

  async publishClip(clipId: string, platform: 'youtube' | 'instagram') {
    return this.client.post(`/clips/${clipId}/publish`, { platform });
  }
}

export const apiClient = new ApiClient();
