import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import * as videoService from '../services/video';
import { getStorageProvider } from '../utils/storage';
import { AppError } from '../middleware/error';
import { createUploadJob, getUploadProgress as getQueueProgress } from '../services/queue';
import { notifyUploadProcessed } from '../utils/n8n';
import logger from '../utils/logger';
import type { UploadProgress } from '../types';

const uploadProgress = new Map<string, UploadProgress>();

export const validateCreateVideo = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('caption').optional().trim(),
  body('hashtags').optional().isArray(),
];

export const validateUpdateVideo = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('caption').optional().trim(),
  body('hashtags').optional().isArray(),
];

const MIN_VIDEO_SIZE_BYTES = 50 * 1024;
const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;

function normalizeHashtags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value !== 'string') return [];

  return value
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#/, '').trim())
    .filter(Boolean);
}

function validateVideoFile(file: Express.Multer.File): string | null {
  const mime = file.mimetype;
  if (!['video/mp4', 'video/quicktime'].includes(mime)) {
    return 'Only MP4 and MOV files are accepted';
  }

  if (file.size < MIN_VIDEO_SIZE_BYTES) {
    return 'File is too small or empty';
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return 'File exceeds maximum size of 500MB';
  }

  return null;
}

export async function uploadVideos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user || !req.files) {
      throw new AppError('Missing authentication or files', 400);
    }

    const files = (
      Array.isArray(req.files) ? req.files : Object.values(req.files).flat()
    ) as Express.Multer.File[];

    for (const file of files) {
      const validationError = validateVideoFile(file);
      if (validationError) {
        throw new AppError(validationError, 400);
      }
    }

    const defaultTitle = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const defaultCaption = typeof req.body.caption === 'string' ? req.body.caption.trim() : '';
    const defaultHashtags = normalizeHashtags(req.body.hashtags);

    const storage = getStorageProvider();
    const uploadedVideos = [];

    for (const [index, file] of files.entries()) {
      try {
        const fileUrl = await storage.upload({
          filename: file.originalname,
          contentType: file.mimetype,
          data: file.buffer,
        });

        const baseName = file.originalname.replace(/\.[^.]+$/, '');
        const title = defaultTitle
          ? files.length > 1
            ? `${defaultTitle} ${index + 1}`
            : defaultTitle
          : baseName;

        const video = await videoService.createVideo(
          req.user.id,
          title,
          defaultCaption,
          defaultHashtags,
          fileUrl,
          file.originalname,
          file.size,
        );

        uploadedVideos.push(video);

        const job = await createUploadJob(video.id, req.user.id, file.originalname, file.size);
        if (!job) {
          // Queue is unavailable; still notify n8n so processing is not blocked.
          await notifyUploadProcessed(video.id, req.user.id, file.originalname, file.size);
        }

        uploadProgress.set(video.id, {
          videoId: video.id,
          userId: req.user.id,
          fileName: file.originalname,
          uploadedBytes: file.size,
          totalBytes: file.size,
          progress: 100,
        });

        setTimeout(() => uploadProgress.delete(video.id), 60 * 60 * 1000).unref();
      } catch (error) {
        logger.error({ error }, 'Failed to upload file');
      }
    }

    res.status(201).json({ videos: uploadedVideos });
  } catch (error) {
    next(error);
  }
}

export async function getUploadProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { videoId } = req.params;
    const queueProgress = await getQueueProgress(videoId, req.user.id);

    if (queueProgress !== null) {
      res.json({
        videoId,
        progress: queueProgress,
      });
      return;
    }

    const progress = uploadProgress.get(videoId);
    if (!progress || (progress.userId && progress.userId !== req.user.id)) {
      throw new AppError('Progress not found', 404);
    }

    res.json(progress);
  } catch (error) {
    next(error);
  }
}

export async function getVideos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const status = req.query.status as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const { videos, total } = await videoService.getUserVideos(req.user.id, status, limit, offset);

    res.json({ videos, total });
  } catch (error) {
    next(error);
  }
}

export async function getVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const video = await videoService.getVideoById(req.user.id, req.params.videoId);
    res.json(video);
  } catch (error) {
    next(error);
  }
}

export async function updateVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { title, caption, hashtags } = req.body;
    const video = await videoService.updateVideoMetadata(req.user.id, req.params.videoId, { title, caption, hashtags });
    res.json(video);
  } catch (error) {
    next(error);
  }
}

export async function deleteVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    await videoService.deleteVideo(req.user.id, req.params.videoId);
    res.json({ message: 'Video deleted' });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const stats = await videoService.getDashboardStats(req.user.id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
}
