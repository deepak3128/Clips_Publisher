'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { DragDropArea } from '@/components/DragDropArea';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function UploadPage() {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');

  if (!token) return null;

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const response = await apiClient.uploadVideos(files);
      setFiles([]);
      setTitle('');
      setCaption('');
      setHashtags('');
      router.push('/library');
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Upload Videos</h1>

        <div className="bg-white rounded-lg shadow p-8">
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Upload Videos</h2>
            <DragDropArea
              onFilesSelected={handleFilesSelected}
              multiple={true}
            />
          </div>

          {files.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Files to Upload</h2>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
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

          <div className="flex gap-4">
            <Button
              onClick={handleUpload}
              isLoading={isUploading}
              disabled={files.length === 0}
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
