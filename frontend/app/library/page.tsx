'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { Video } from '@/types';

function hashtagsToString(value: string[] | string | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value.join(' ') : value;
}

function parseHashtags(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#/, '').trim())
    .filter(Boolean);
}

export default function LibraryPage() {
  const token = useAuthStore((state) => state.token);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    const fetchVideos = async () => {
      try {
        const response = await apiClient.getVideos(status || undefined);
        setVideos(response.data.videos);
      } catch (fetchError) {
        console.error('Failed to fetch videos', fetchError);
        setError('Failed to load videos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [token, status]);

  const handleEdit = (video: Video) => {
    setEditingId(video.id);
    setEditTitle(video.title);
    setEditCaption(video.caption || '');
    setEditHashtags(hashtagsToString(video.hashtags));
    setError('');
  };

  const handleSaveEdit = async (videoId: string) => {
    if (!editTitle.trim()) {
      setError('Title cannot be empty');
      return;
    }

    setSavingId(videoId);
    setError('');
    try {
      const hashtags = parseHashtags(editHashtags);
      await apiClient.updateVideo(videoId, {
        title: editTitle.trim(),
        caption: editCaption.trim(),
        hashtags,
      });
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? {
                ...v,
                title: editTitle.trim(),
                caption: editCaption.trim(),
                hashtags,
              }
            : v,
        ),
      );
      setEditingId(null);
    } catch (updateError: any) {
      setError(updateError?.response?.data?.error || 'Failed to update video');
    } finally {
      setSavingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setError('');
  };

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

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12 text-slate-600">No videos found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition"
              >
                <div className="aspect-video bg-slate-200"></div>
                <div className="p-4">
                  {editingId === video.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm font-semibold"
                      />
                      <textarea
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                        rows={3}
                        placeholder="Caption"
                      />
                      <input
                        type="text"
                        value={editHashtags}
                        onChange={(e) => setEditHashtags(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                        placeholder="hashtags separated by spaces"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(video.id)}
                          isLoading={savingId === video.id}
                          disabled={!editTitle.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={savingId === video.id}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-semibold mb-2">{video.title}</h3>
                      <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                        {video.caption || 'No caption'}
                      </p>
                      <p className="text-xs text-blue-600 mb-4 line-clamp-1">
                        {hashtagsToString(video.hashtags) || 'No hashtags'}
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
                        <Button variant="secondary" size="sm" onClick={() => handleEdit(video)}>
                          Edit
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
