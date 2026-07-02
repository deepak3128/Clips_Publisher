'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { Video } from '@/types';

export default function LibraryPage() {
  const token = useAuthStore((state) => state.token);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (!token) return;

    const fetchVideos = async () => {
      try {
        const response = await apiClient.getVideos(status || undefined);
        setVideos(response.data.videos);
      } catch (error) {
        console.error('Failed to fetch videos', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [token, status]);

  if (!token) return null;

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Video Library</h1>

        <div className="mb-6 flex gap-4">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg"
          >
            <option value="">All Videos</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition"
              >
                <div className="aspect-video bg-slate-200"></div>
                <div className="p-4">
                  <h3 className="font-semibold mb-2">{video.title}</h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {video.caption || 'No caption'}
                  </p>
                  <div className="flex justify-between items-center">
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
                    <Button variant="secondary" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
