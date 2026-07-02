import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import * as scheduleService from '../services/schedule';
import * as videoService from '../services/video';
import { AppError } from '../middleware/error';

export const validateCreateSchedule = [
  body('videoIds').isArray({ min: 1 }),
  body('platform').isIn(['youtube', 'instagram', 'both']),
  body('publishDates').isArray({ min: 1 }),
];

export const validateBulkSchedule = [
  body('videoIds').isArray({ min: 1 }),
  body('platform').isIn(['youtube', 'instagram', 'both']),
  body('startDate').isISO8601(),
  body('postsPerDay').isInt({ min: 1, max: 5 }),
  body('postingTimes').isArray({ min: 1 }),
];

export async function createSchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { videoIds, platform, publishDates } = req.body;

    // Verify videos belong to user
    for (const videoId of videoIds) {
      await videoService.getVideoById(req.user.id, videoId);
    }

    const schedules = [];
    for (const videoId of videoIds) {
      const created = await scheduleService.createSchedules(videoId, platform, publishDates.map((d: string) => new Date(d)));
      schedules.push(...created);
    }

    res.status(201).json({ schedules });
  } catch (error) {
    next(error);
  }
}

export async function bulkScheduleVideos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { videoIds, platform, startDate, postsPerDay, postingTimes } = req.body;

    // Verify videos belong to user
    for (const videoId of videoIds) {
      await videoService.getVideoById(req.user.id, videoId);
    }

    const schedules = await scheduleService.bulkScheduleVideos(videoIds, platform, new Date(startDate), postsPerDay, postingTimes);

    // Update video status to scheduled
    for (const videoId of videoIds) {
      await videoService.updateVideoStatus(req.user.id, videoId, 'scheduled');
    }

    res.status(201).json({ schedules });
  } catch (error) {
    next(error);
  }
}

export async function getSchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { videoId } = req.params;

    // Verify video belongs to user
    await videoService.getVideoById(req.user.id, videoId);

    const schedules = await scheduleService.getSchedulesByVideo(videoId);
    res.json({ schedules });
  } catch (error) {
    next(error);
  }
}

export async function deleteSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { scheduleId } = req.params;
    await scheduleService.deleteSchedule(scheduleId);

    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    next(error);
  }
}
