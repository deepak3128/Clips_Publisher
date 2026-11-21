import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import * as videoService from '../services/video';
import * as publishService from '../services/publish';
import { AppError } from '../middleware/error';
import type { Video } from '../types';

export const validatePublish = [body('videoId').isUUID()];
export const validateRetry = [body('publishLogId').isUUID()];

async function getAuthorizedVideo(req: Request, videoId: string): Promise<Video> {
  if (!req.isService && !req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const video = await videoService.getVideoForPublishing(videoId);
  if (!video || (!req.isService && video.user_id !== req.user?.id)) {
    throw new AppError('Video not found', 404);
  }

  return video;
}

export async function publishYouTube(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const video = await getAuthorizedVideo(req, req.body.videoId);
    const result = await publishService.publishToYouTube(
      video.id,
      video.user_id,
      video.file_url,
      video.title,
      video.caption,
      video.hashtags,
    );

    await videoService.updateVideoStatus(
      video.user_id,
      video.id,
      result.success ? 'published' : 'failed',
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function publishInstagram(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const video = await getAuthorizedVideo(req, req.body.videoId);
    const result = await publishService.publishToInstagram(
      video.id,
      video.user_id,
      video.file_url,
      video.caption,
      video.hashtags,
    );

    await videoService.updateVideoStatus(
      video.user_id,
      video.id,
      result.success ? 'published' : 'failed',
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getFailedPublishes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const logs = await publishService.getFailedPublishLogs(
      50,
      req.isService ? undefined : req.user?.id,
    );
    res.json({ logs });
  } catch (error) {
    next(error);
  }
}

export async function retryPublish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const log = await publishService.getPublishLogWithVideo(req.body.publishLogId);
    if (!log || (!req.isService && log.user_id !== req.user?.id)) {
      throw new AppError('Publish log not found', 404);
    }

    const result = await publishService.retryFailedPublish(
      log.id,
      req.isService ? undefined : req.user?.id,
    );

    await videoService.updateVideoStatus(
      log.user_id,
      log.video_id,
      result.success ? 'published' : 'failed',
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
}
