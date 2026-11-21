'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { Clip, ClipJob, ClipSettings } from '@/types';

const FONTS = [
  'Arial',
  'Verdana',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Impact',
  'Trebuchet MS',
];

const DEFAULT_SETTINGS: ClipSettings = {
  clipCount: 5,
  font: 'Arial',
  fontSize: 48,
  fontColor: '#ffffff',
  bold: true,
  italic: false,
  position: 'bottom',
  autoCaptions: true,
};

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function errorMessage(error: any): string {
  return error?.response?.data?.error || 'Something went wrong. Please try again.';
}

export default function ClipsPage() {
  const token = useAuthStore((state) => state.token);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [sourceMode, setSourceMode] = useState<'upload' | 'url'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [settings, setSettings] = useState<ClipSettings>(DEFAULT_SETTINGS);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ClipJob | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [publishing, setPublishing] = useState<Record<string, boolean>>({});
  const [publishMessage, setPublishMessage] = useState<Record<string, string>>({});

  useEffect(() => {
    if (step !== 3 || !jobId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await apiClient.getClipJob(jobId);
        if (cancelled) return;
        const current = res.data.job as ClipJob;
        setJob(current);

        if (current.status === 'completed') {
          const clipsRes = await apiClient.getClips(jobId);
          if (!cancelled) {
            setClips(clipsRes.data.clips);
            setStep(4);
          }
        } else if (current.status === 'failed') {
          setError(current.error_message || 'Clip job failed');
        }
      } catch (pollError) {
        if (!cancelled) setError(errorMessage(pollError));
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 1200);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [step, jobId]);

  if (!token) return null;

  const updateSettings = <K extends keyof ClipSettings>(key: K, value: ClipSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleStart = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const response =
        sourceMode === 'upload'
          ? await apiClient.createClipFromUpload(file as File, settings, setUploadProgress)
          : await apiClient.createClipFromUrl(url.trim(), settings);

      const created = response.data.job as ClipJob;
      setJobId(created.id);
      setJob(created);
      setStep(3);
    } catch (startError) {
      setError(errorMessage(startError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async (clip: Clip, platform: 'youtube' | 'instagram') => {
    const key = `${clip.id}-${platform}`;
    setPublishing((prev) => ({ ...prev, [key]: true }));
    setPublishMessage((prev) => ({ ...prev, [key]: '' }));

    try {
      const res = await apiClient.publishClip(clip.id, platform);
      setPublishMessage((prev) => ({
        ...prev,
        [key]: res.data.success ? 'Published successfully' : res.data.error || 'Publish failed',
      }));
    } catch (publishError) {
      setPublishMessage((prev) => ({ ...prev, [key]: errorMessage(publishError) }));
    } finally {
      setPublishing((prev) => ({ ...prev, [key]: false }));
    }
  };

  const reset = () => {
    setStep(1);
    setSourceMode('upload');
    setFile(null);
    setUrl('');
    setSettings(DEFAULT_SETTINGS);
    setJobId(null);
    setJob(null);
    setClips([]);
    setError('');
    setUploadProgress(0);
    setPublishMessage({});
  };

  const statusLabel = job
    ? ({
        queued: 'Queued',
        downloading: 'Downloading source video...',
        analyzing: 'Finding the best moments...',
        transcribing: 'Generating captions from speech...',
        clipping: 'Rendering clips and burning captions...',
        completed: 'Done',
        failed: 'Failed',
      }[job.status] || job.status)
    : 'Preparing...';

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Clip Publisher</h1>
          <p className="text-slate-600 mt-2">
            Turn a YouTube link, public video URL, or local video into short clips with
            auto-generated captions.
          </p>
        </div>

        <div className="flex gap-3 mb-8">
          {['Source', 'Style', 'Processing', 'Result'].map((label, index) => (
            <div
              key={label}
              className={`flex-1 px-4 py-2 rounded text-center text-sm font-medium ${
                step === index + 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {index + 1}. {label}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-8 max-w-3xl">
            <div className="flex gap-4 mb-8">
              <Button
                variant={sourceMode === 'upload' ? 'primary' : 'secondary'}
                onClick={() => setSourceMode('upload')}
              >
                Upload local video
              </Button>
              <Button
                variant={sourceMode === 'url' ? 'primary' : 'secondary'}
                onClick={() => setSourceMode('url')}
              >
                YouTube / public URL
              </Button>
            </div>

            {sourceMode === 'upload' ? (
              <div>
                <label className="block font-semibold mb-3">Choose a video file</label>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-600"
                />
                {file && (
                  <p className="mt-3 text-sm text-slate-700">
                    Selected: <strong>{file.name}</strong> ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </p>
                )}
              </div>
            ) : (
              <Input
                label="Video URL"
                placeholder="https://youtube.com/watch?v=... or https://example.com/video.mp4"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            )}

            <div className="mt-8">
              <Button
                onClick={() => setStep(2)}
                disabled={sourceMode === 'upload' ? !file : !url.trim()}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-lg shadow p-8 max-w-3xl space-y-6">
            <div>
              <label className="block font-semibold mb-2">How many clips do you need?</label>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.clipCount}
                onChange={(e) =>
                  updateSettings('clipCount', Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))
                }
                className="w-32 px-4 py-2 border border-slate-300 rounded-lg"
              />
              <p className="text-sm text-slate-500 mt-2">
                Each clip is capped at {process.env.NEXT_PUBLIC_MAX_CLIP_SECONDS || 60} seconds.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold mb-2">Font</label>
                <select
                  value={settings.font}
                  onChange={(e) => updateSettings('font', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                >
                  {FONTS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-2">Caption position</label>
                <select
                  value={settings.position}
                  onChange={(e) => updateSettings('position', e.target.value as 'top' | 'bottom')}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="bottom">Bottom</option>
                  <option value="top">Top</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-2">Font size</label>
                <input
                  type="number"
                  min={16}
                  max={120}
                  value={settings.fontSize}
                  onChange={(e) => updateSettings('fontSize', parseInt(e.target.value) || 48)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">Font colour</label>
                <input
                  type="color"
                  value={settings.fontColor}
                  onChange={(e) => updateSettings('fontColor', e.target.value)}
                  className="w-full h-11 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-8">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.bold}
                  onChange={(e) => updateSettings('bold', e.target.checked)}
                  className="mr-3"
                />
                <span className="font-semibold">Bold</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.italic}
                  onChange={(e) => updateSettings('italic', e.target.checked)}
                  className="mr-3"
                />
                <span className="italic font-semibold">Italic</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.autoCaptions}
                  onChange={(e) => updateSettings('autoCaptions', e.target.checked)}
                  className="mr-3"
                />
                <span className="font-semibold">Auto captions from speech</span>
              </label>
            </div>

            {!settings.autoCaptions && (
              <div>
                <label className="block font-semibold mb-2">Caption text</label>
                <textarea
                  value={settings.captionText || ''}
                  onChange={(e) => updateSettings('captionText', e.target.value)}
                  rows={3}
                  placeholder="Text to burn into every clip"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            )}

            <div className="flex gap-4">
              <Button onClick={() => setStep(1)} variant="secondary">
                Back
              </Button>
              <Button onClick={handleStart} isLoading={isSubmitting}>
                Continue &amp; start clipping
              </Button>
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <p className="text-sm text-slate-600">Uploading: {uploadProgress}%</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-lg shadow p-8 max-w-3xl">
            <h2 className="text-xl font-semibold mb-6">{statusLabel}</h2>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden mb-4">
              <div
                className="bg-blue-600 h-full transition-all"
                style={{ width: `${job?.progress || 0}%` }}
              />
            </div>
            <p className="text-sm text-slate-600">{job?.progress || 0}% complete</p>
            {job?.status === 'failed' && (
              <div className="mt-6">
                <Button onClick={reset}>Start over</Button>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Your clips</h2>
              <Button variant="secondary" onClick={reset}>
                New project
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {clips.map((clip) => (
                <div key={clip.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <video
                    src={clip.file_url}
                    controls
                    className="w-full aspect-video bg-black"
                    preload="metadata"
                  />
                  <div className="p-5">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold">{clip.title}</h3>
                      <span className="text-sm text-slate-500">
                        {formatTime(clip.duration)} · {formatTime(clip.start_time)}–
                        {formatTime(clip.end_time)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <a
                        href={clip.file_url}
                        download={clip.file_name}
                        className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900"
                      >
                        Download
                      </a>
                      <Button
                        size="sm"
                        variant="secondary"
                        isLoading={publishing[`${clip.id}-youtube`]}
                        onClick={() => handlePublish(clip, 'youtube')}
                      >
                        Publish YouTube Shorts
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        isLoading={publishing[`${clip.id}-instagram`]}
                        onClick={() => handlePublish(clip, 'instagram')}
                      >
                        Publish Instagram Reels
                      </Button>
                    </div>

                    {publishMessage[`${clip.id}-youtube`] && (
                      <p className="text-sm text-slate-600">
                        YouTube: {publishMessage[`${clip.id}-youtube`]}
                      </p>
                    )}
                    {publishMessage[`${clip.id}-instagram`] && (
                      <p className="text-sm text-slate-600">
                        Instagram: {publishMessage[`${clip.id}-instagram`]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
