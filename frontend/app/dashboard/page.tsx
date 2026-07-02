'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { DashboardStats, Video } from '@/types';

export default function DashboardPage() {
  const token = useAuthStore((state) => state.token);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const [statsRes, videosRes] = await Promise.all([
          apiClient.getDashboardStats(),
          apiClient.getVideos(),
        ]);

        setStats(statsRes.data);
        setRecentVideos(videosRes.data.videos.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (!token) return null;

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-slate-600 text-sm font-medium mb-2">
                  Total Videos
                </div>
                <div className="text-4xl font-bold">{stats.total}</div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-slate-600 text-sm font-medium mb-2">
                  Scheduled
                </div>
                <div className="text-4xl font-bold text-blue-600">
                  {stats.scheduled}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-slate-600 text-sm font-medium mb-2">
                  Published
                </div>
                <div className="text-4xl font-bold text-green-600">
                  {stats.published}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-slate-600 text-sm font-medium mb-2">
                  Failed
                </div>
                <div className="text-4xl font-bold text-red-600">
                  {stats.failed}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Recent Videos</h2>
              {recentVideos.length > 0 ? (
                <div className="space-y-4">
                  {recentVideos.map((video) => (
                    <div
                      key={video.id}
                      className="p-4 border border-slate-200 rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{video.title}</h3>
                          <p className="text-sm text-slate-600">
                            {video.fileName}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            video.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : video.status === 'scheduled'
                                ? 'bg-blue-100 text-blue-800'
                                : video.status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {video.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600">No videos uploaded yet</p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
