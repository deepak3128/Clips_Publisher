'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { DragDropArea } from '@/components/DragDropArea';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import * as Progress from '@radix-ui/react-progress';

function parseHashtags(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#/, '').trim())
    .filter(Boolean);
}

export default function UploadPage() {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const mountedRef = useRef(true);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  if (!token) return null;

  const waitForProcessing = async (videoIds: string[]): Promise<void> => {
    for (let attempt = 0; attempt < 15; attempt++) {
      if (!mountedRef.current) return;

      const progresses = await Promise.all(
        videoIds.map((id) =>
          apiClient
            .getUploadProgress(id)
            .then((response) =>
              typeof response.data.progress === 'number' ? response.data.progress : 100,
            )
            .catch(() => 100),
        ),
      );

      const average = Math.round(
        progresses.reduce((total, value) => total + value, 0) / progresses.length,
      );
      setUploadProgress(average);

      if (progresses.every((value) => value >= 100)) return;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setError('');
    setProgressStatus('Uploading...');
    setUploadProgress(0);

    try {
      const response = await apiClient.uploadVideos(
        files,
        {
          title: title.trim(),
          caption: caption.trim(),
          hashtags: parseHashtags(hashtags),
        },
        (progress) => {
          if (!mountedRef.current) return;
          setUploadProgress(progress);
          setProgressStatus(`Uploading... ${progress}%`);
        },
      );

      const videoIds: string[] = (response.data.videos || []).map((video: any) => video.id);
      setFiles([]);
      setTitle('');
      setCaption('');
      setHashtags('');

      if (videoIds.length > 0) {
        setProgressStatus('Processing...');
        await waitForProcessing(videoIds);
      }

      if (!mountedRef.current) return;
      setUploadProgress(100);
      setProgressStatus('Upload complete');
      redirectTimerRef.current = setTimeout(() => router.push('/library'), 800);
    } catch (uploadError: any) {
      if (!mountedRef.current) return;
      setError(uploadError?.response?.data?.error || 'Upload failed. Please try again.');
      setProgressStatus('Upload failed');
    } finally {
      if (mountedRef.current) setIsUploading(false);
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Upload Videos</h1>

        <div className="bg-white rounded-lg shadow p-8">
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Upload Videos</h2>
            <DragDropArea onFilesSelected={handleFilesSelected} multiple={true} />
          </div>

          {files.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Files to Upload</h2>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex justify-between items-center p-4 border border-slate-200 rounded"
                  >
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-slate-600">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 mb-8">
            <Input
              label="Default Title (Optional)"
              placeholder="Video title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <Textarea
              label="Default Caption (Optional)"
              placeholder="Video caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />

            <Input
              label="Hashtags (Optional)"
              placeholder="gaming trending viral"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {(isUploading || uploadProgress > 0) && (
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{progressStatus}</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress.Root
                value={uploadProgress}
                className="w-full h-3 bg-slate-200 rounded-full overflow-hidden"
              >
                <Progress.Indicator
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </Progress.Root>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={handleUpload}
              isLoading={isUploading}
              disabled={files.length === 0 || isUploading}
            >
              Upload {files.length > 0 ? `${files.length} Video(s)` : ''}
            </Button>
            <Button variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
