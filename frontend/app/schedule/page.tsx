'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { Video } from '@/types';

type ScheduleType = 'fixed' | 'custom' | 'bulk';

export default function SchedulePage() {
  const token = useAuthStore((state) => state.token);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('fixed');
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [platform, setPlatform] = useState<'youtube' | 'instagram' | 'both'>('both');
  const [startDate, setStartDate] = useState('');
  const [postsPerDay, setPostsPerDay] = useState(1);
  const [postingTimes, setPostingTimes] = useState(['10:00']);
  const [customDates, setCustomDates] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) return;

    const fetchVideos = async () => {
      try {
        const response = await apiClient.getVideos();
        setVideos(response.data.videos);
      } catch {
        setError('Failed to load videos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [token]);

  if (!token) return null;

  const toggleVideo = (videoId: string) => {
    setSelectedIds((prev) =>
      prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId],
    );
    setCustomDates((prev) => ({ ...prev, [videoId]: prev[videoId] || startDate }));
    setError('');
    setSuccess('');
  };

  const handleSchedule = async () => {
    setError('');
    setSuccess('');

    if (selectedIds.length === 0) {
      setError('Please select at least one video');
      return;
    }

    if (scheduleType === 'bulk') {
      if (!startDate) {
        setError('Please choose a start date');
        return;
      }
      if (postingTimes.some((time) => !time)) {
        setError('Please fill in all posting times');
        return;
      }
    } else if (scheduleType === 'custom') {
      const missing = selectedIds.find((id) => !customDates[id]);
      if (missing) {
        setError('Please choose a date for every selected video');
        return;
      }
    } else if (!startDate) {
      setError('Please choose a start date');
      return;
    }

    setIsScheduling(true);
    try {
      if (scheduleType === 'bulk') {
        await apiClient.bulkScheduleVideos(
          selectedIds,
          platform,
          startDate,
          postsPerDay,
          postingTimes,
        );
      } else if (scheduleType === 'fixed') {
        for (const [index, videoId] of selectedIds.entries()) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + index);
          date.setHours(10, 0, 0, 0);
          await apiClient.createSchedules([videoId], platform, [date.toISOString()]);
        }
      } else {
        for (const videoId of selectedIds) {
          const date = new Date(`${customDates[videoId]}T10:00:00`);
          await apiClient.createSchedules([videoId], platform, [date.toISOString()]);
        }
      }

      setSuccess(`${selectedIds.length} video(s) scheduled successfully!`);
      setSelectedIds([]);
      setCustomDates({});
      setStartDate('');
      setPostingTimes(['10:00']);
      setPostsPerDay(1);

      const response = await apiClient.getVideos();
      setVideos(response.data.videos);
    } catch (scheduleError: any) {
      setError(scheduleError?.response?.data?.error || 'Failed to schedule videos');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Schedule Videos</h1>

        <div className="bg-white rounded-lg shadow p-8 max-w-3xl">
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Scheduling Options</h2>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scheduleType"
                  value="fixed"
                  checked={scheduleType === 'fixed'}
                  onChange={() => setScheduleType('fixed')}
                  className="mr-3"
                />
                <span>Fixed Interval (1 video per day starting at 10:00)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scheduleType"
                  value="custom"
                  checked={scheduleType === 'custom'}
                  onChange={() => setScheduleType('custom')}
                  className="mr-3"
                />
                <span>Custom Scheduling (one date per video)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scheduleType"
                  value="bulk"
                  checked={scheduleType === 'bulk'}
                  onChange={() => setScheduleType('bulk')}
                  className="mr-3"
                />
                <span>Bulk Scheduling (multiple posts per day)</span>
              </label>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="block font-semibold mb-2">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as 'youtube' | 'instagram' | 'both')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              >
                <option value="youtube">YouTube Shorts</option>
                <option value="instagram">Instagram Reels</option>
                <option value="both">Both Platforms</option>
              </select>
            </div>

            {scheduleType !== 'custom' && (
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            )}

            {scheduleType === 'bulk' && (
              <>
                <div>
                  <label className="block font-semibold mb-2">Posts Per Day</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={postsPerDay}
                    onChange={(e) => {
                      const value = Math.min(5, Math.max(1, parseInt(e.target.value) || 1));
                      setPostsPerDay(value);
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">Posting Times</label>
                  <div className="space-y-2">
                    {Array.from({ length: postsPerDay }).map((_, index) => (
                      <input
                        key={index}
                        type="time"
                        value={postingTimes[index] || '10:00'}
                        onChange={(e) => {
                          const newTimes = [...postingTimes];
                          newTimes[index] = e.target.value;
                          setPostingTimes(newTimes);
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Select Videos</h2>
              <span className="text-sm text-slate-600">{selectedIds.length} selected</span>
            </div>

            {isLoading ? (
              <p className="text-slate-600">Loading videos...</p>
            ) : videos.length === 0 ? (
              <p className="text-slate-600">No videos yet. Upload some videos first.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto border border-slate-200 rounded-lg p-3">
                {videos.map((video) => (
                  <div key={video.id} className="space-y-2">
                    <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                      <span className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(video.id)}
                          onChange={() => toggleVideo(video.id)}
                          className="mr-3"
                        />
                        <span className="font-medium">{video.title}</span>
                        <span className="ml-3 text-sm text-slate-500 capitalize">
                          {video.status}
                        </span>
                      </span>
                    </label>

                    {scheduleType === 'custom' && selectedIds.includes(video.id) && (
                      <div className="pl-8 pb-2">
                        <input
                          type="date"
                          value={customDates[video.id] || ''}
                          onChange={(e) =>
                            setCustomDates((prev) => ({
                              ...prev,
                              [video.id]: e.target.value,
                            }))
                          }
                          className="px-3 py-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded text-green-700">
              {success}
            </div>
          )}

          <Button
            onClick={handleSchedule}
            isLoading={isScheduling}
            disabled={selectedIds.length === 0 || isLoading}
          >
            Schedule Videos
          </Button>
        </div>
      </div>
    </Layout>
  );
}
