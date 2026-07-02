import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to attach token
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
  async uploadVideos(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append('videos', file));
    return this.client.post('/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async getVideos(status?: string, limit = 20, offset = 0) {
    return this.client.get('/videos', {
      params: { status, limit, offset },
    });
  }

  async getVideo(videoId: string) {
    return this.client.get(`/videos/${videoId}`);
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
}

export const apiClient = new ApiClient();
