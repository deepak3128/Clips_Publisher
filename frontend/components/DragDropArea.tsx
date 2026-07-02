'use client';

import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';

interface DragDropProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
}

export function DragDropArea({
  onFilesSelected,
  accept = '.mp4,.mov',
  multiple = true,
  maxSize = 500 * 1024 * 1024, // 500MB
}: DragDropProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFiles = (files: File[]): boolean => {
    setError(null);

    if (!multiple && files.length > 1) {
      setError('Please select only one file');
      return false;
    }

    const acceptedTypes = accept.split(',').map((t) => t.trim());

    for (const file of files) {
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!acceptedTypes.includes(ext)) {
        setError(`Invalid file type: ${file.name}`);
        return false;
      }

      if (file.size > maxSize) {
        setError(`File too large: ${file.name}`);
        return false;
      }
    }

    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (validateFiles(files)) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (validateFiles(files)) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-300 hover:border-slate-400'
      }`}
    >
      <div className="mb-4 flex justify-center">
        <Upload className="w-12 h-12 text-slate-400" />
      </div>

      <h3 className="text-lg font-semibold mb-2">Drop your videos here</h3>
      <p className="text-slate-600 mb-4">or</p>

      <label className="inline-block">
        <span className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded cursor-pointer transition">
          Browse Files
        </span>
        <input
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
      </label>

      <p className="text-sm text-slate-500 mt-4">
        MP4 or MOV • Max 500MB each
      </p>

      {error && <p className="mt-4 text-red-600 font-medium">{error}</p>}
    </div>
  );
}
