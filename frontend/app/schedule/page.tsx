'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function SchedulePage() {
  const token = useAuthStore((state) => state.token);
  const [scheduleType, setScheduleType] = useState<'fixed' | 'custom' | 'bulk'>(
    'fixed',
  );
  const [videoIds, setVideoIds] = useState<string[]>([]);
  const [platform, setPlatform] = useState<'youtube' | 'instagram' | 'both'>(
    'both',
  );
  const [startDate, setStartDate] = useState('');
  const [postsPerDay, setPostsPerDay] = useState(1);
  const [postingTimes, setPostingTimes] = useState(['10:00']);
  const [isScheduling, setIsScheduling] = useState(false);

  if (!token) return null;

  const handleSchedule = async () => {
    if (videoIds.length === 0) {
      alert('Please select at least one video');
      return;
    }

    setIsScheduling(true);
    try {
      if (scheduleType === 'bulk') {
        await apiClient.bulkScheduleVideos(
          videoIds,
          platform,
          startDate,
          postsPerDay,
          postingTimes,
        );
      } else {
        // Handle fixed/custom scheduling
      }
      alert('Videos scheduled successfully!');
      setVideoIds([]);
      setStartDate('');
      setPostingTimes(['10:00']);
      setPostsPerDay(1);
    } catch (error) {
      console.error('Scheduling failed', error);
      alert('Failed to schedule videos');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Schedule Videos</h1>

        <div className="bg-white rounded-lg shadow p-8 max-w-2xl">
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Scheduling Options</h2>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scheduleType"
                  value="fixed"
                  checked={scheduleType === 'fixed'}
                  onChange={(e) =>
                    setScheduleType(e.target.value as 'fixed' | 'custom' | 'bulk')
                  }
                  className="mr-3"
                />
                <span>Fixed Interval (1 video per day)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scheduleType"
                  value="custom"
                  checked={scheduleType === 'custom'}
                  onChange={(e) =>
                    setScheduleType(e.target.value as 'fixed' | 'custom' | 'bulk')
                  }
                  className="mr-3"
                />
                <span>Custom Scheduling</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scheduleType"
                  value="bulk"
                  checked={scheduleType === 'bulk'}
                  onChange={(e) =>
                    setScheduleType(e.target.value as 'fixed' | 'custom' | 'bulk')
                  }
                  className="mr-3"
                />
                <span>Bulk Scheduling (Multiple posts per day)</span>
              </label>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="block font-semibold mb-2">Platform</label>
              <select
                value={platform}
                onChange={(e) =>
                  setPlatform(e.target.value as 'youtube' | 'instagram' | 'both')
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              >
                <option value="youtube">YouTube Shorts</option>
                <option value="instagram">Instagram Reels</option>
                <option value="both">Both Platforms</option>
              </select>
            </div>

            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            {scheduleType === 'bulk' && (
              <>
                <div>
                  <label className="block font-semibold mb-2">Posts Per Day</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={postsPerDay}
                    onChange={(e) => setPostsPerDay(parseInt(e.target.value))}
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

          <Button onClick={handleSchedule} isLoading={isScheduling}>
            Schedule Videos
          </Button>
        </div>
      </div>
    </Layout>
  );
}
