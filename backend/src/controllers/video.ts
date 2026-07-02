import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import * as videoService from '../services/video';
import { getStorageProvider } from '../utils/storage';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import type { UploadProgress } from '../types';

// In-memory storage for upload progress (in production, use Redis)
const uploadProgress = new Map<string, UploadProgress>();

export const validateCreateVideo = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('caption').optional().trim(),
  body('hashtags').optional().isArray(),
];

export async function uploadVideos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user || !req.files) {
      throw new AppError('Missing authentication or files', 400);
    }

    const storage = getStorageProvider();
    const uploadedVideos = [];

    for (const file of Array.isArray(req.files) ? req.files : [req.files]) {
      try {
        const fileUrl = await storage.upload({
          filename: file.originalname,
          contentType: file.mimetype,
          data: file.buffer,
        });

        const video = await videoService.createVideo(
          req.user.id,
          file.originalname.split('.')[0],
          '',
          [],
          fileUrl,
          file.originalname,
          file.size,
        );

        uploadedVideos.push(video);

        // Track progress
        uploadProgress.set(video.id, {
          videoId: video.id,
          fileName: file.originalname,
          uploadedBytes: file.size,
          totalBytes: file.size,
          progress: 100,
        });
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
    const { videoId } = req.params;
    const progress = uploadProgress.get(videoId);

    if (!progress) {
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

    // Implementation would update video metadata
    const video = await videoService.getVideoById(req.user.id, req.params.videoId);
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
